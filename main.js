/* ==========================================================
   TEKKZ MEDIA — shared behaviour (home + services)
   ========================================================== */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  document.addEventListener('DOMContentLoaded', function () {
    initPreloader();
    initNav();
    initHeroWords();
    initHeroPlusGrid();
    initHeroScroll();
    initReveal();
    initRealityChart();
    initFaq();
    initContactForm();
    initHeatGrid();
  });

  /* ---------- Preloader: logo splits across two panels, then they part ---------- */
  function initPreloader() {
    var pl = document.getElementById('preloader');
    if (!pl) return;
    if (reduceMotion || document.documentElement.classList.contains('pl-seen')) { pl.remove(); return; }

    var halves = pl.querySelectorAll('.pl-half');
    var logos = pl.querySelectorAll('.pl-logo');
    try { sessionStorage.setItem('tekkz-pl', '1'); } catch (e) {}

    setTimeout(function () {
      logos.forEach(function (l) { l.classList.add('in'); });
      setTimeout(function () {
        halves.forEach(function (h) { h.classList.add('split'); });
        setTimeout(function () { pl.remove(); }, 750);
      }, 1100);
    }, 250);
  }

  /* ---------- Nav: mobile toggle + active section tracking ---------- */
  function initNav() {
    var dock = document.querySelector('.nav-dock');
    var toggle = document.querySelector('.nav-toggle');
    if (toggle && dock) {
      toggle.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = dock.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      document.addEventListener('click', function (e) {
        if (!dock.contains(e.target)) { dock.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); }
      });
      dock.querySelectorAll('.nav-link').forEach(function (a) {
        a.addEventListener('click', function () { dock.classList.remove('is-open'); });
      });
    }

    var tracked = document.querySelectorAll('.nav-link[data-section]');
    if (!tracked.length) return;
    var sections = [];
    tracked.forEach(function (link) {
      var el = document.getElementById(link.getAttribute('data-section'));
      if (el) sections.push({ el: el, link: link });
    });
    var homeLink = document.querySelector('.nav-link[data-home]');

    function update() {
      var probe = window.innerHeight * 0.35;
      var current = null;
      sections.forEach(function (s) {
        var r = s.el.getBoundingClientRect();
        if (r.top <= probe && r.bottom > probe) current = s;
      });
      sections.forEach(function (s) { s.link.classList.toggle('active', s === current); });
      if (homeLink) homeLink.classList.toggle('active', !current && window.scrollY < window.innerHeight);
    }
    onScrollFrame(update);
    update();
  }

  /* ---------- Hero: cycling word ---------- */
  function initHeroWords() {
    var words = document.querySelectorAll('.word');
    if (words.length < 2) return;
    var i = 0;
    setInterval(function () {
      var leaving = words[i];
      i = (i + 1) % words.length;
      var entering = words[i];
      leaving.classList.remove('active');
      leaving.classList.add('leaving');
      entering.classList.add('active');
      setTimeout(function () { leaving.classList.remove('leaving'); }, 460);
    }, 2500);
  }

  /* ---------- Hero: "+" grid that swells around the cursor ---------- */
  function initHeroPlusGrid() {
    var block = document.querySelector('.hero-block');
    var canvas = document.getElementById('hero-plus');
    if (!block || !canvas) return;
    var ctx = canvas.getContext('2d');
    var SPACING = 48, BASE = 5, MAX = 14, BASE_A = 0.12, MAX_A = 0.5, RADIUS = 140;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = 0, h = 0, pts = [], mx = -9999, my = -9999, raf = null;

    function build() {
      w = block.offsetWidth; h = block.offsetHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      pts = [];
      for (var y = SPACING / 2; y < h; y += SPACING) {
        for (var x = SPACING / 2; x < w; x += SPACING) pts.push({ x: x, y: y, s: BASE, a: BASE_A });
      }
    }
    function plus(cx, cy, arm, a) {
      var t = Math.max(1.5, arm * 0.38);
      ctx.globalAlpha = a;
      ctx.fillRect(cx - arm, cy - t / 2, arm * 2, t);
      ctx.fillRect(cx - t / 2, cy - arm, t, arm * 2);
    }
    function frame() {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#FFFFFF';
      var resting = true;
      for (var k = 0; k < pts.length; k++) {
        var p = pts[k];
        var d = Math.hypot(p.x - mx, p.y - my);
        var t = d < RADIUS ? 1 - d / RADIUS : 0;
        var ts = BASE + (MAX - BASE) * t, ta = BASE_A + (MAX_A - BASE_A) * t;
        p.s += (ts - p.s) * 0.12; p.a += (ta - p.a) * 0.12;
        if (Math.abs(p.s - BASE) > 0.05 || Math.abs(p.a - BASE_A) > 0.005) resting = false;
        plus(p.x, p.y, p.s, p.a);
      }
      ctx.globalAlpha = 1;
      if (mx === -9999 && resting) { raf = null; return; }
      raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf) raf = requestAnimationFrame(frame); }

    if (finePointer && !reduceMotion) {
      block.addEventListener('pointermove', function (e) {
        var r = block.getBoundingClientRect();
        mx = e.clientX - r.left; my = e.clientY - r.top; kick();
      });
      block.addEventListener('pointerleave', function () { mx = my = -9999; kick(); });
    }
    window.addEventListener('resize', function () { build(); kick(); });
    build(); kick();
  }

  /* ---------- Hero: dark panel rises and content lifts over the first half-screen of scroll ---------- */
  function initHeroScroll() {
    var canvasEl = document.querySelector('.hero-canvas');
    var tech = document.querySelector('.hero-tech');
    var content = document.querySelector('.hero-content');
    if (!canvasEl || !tech || reduceMotion) return;

    function update() {
      var range = window.innerHeight * 0.5;
      var p = Math.min(1, Math.max(0, -canvasEl.getBoundingClientRect().top / range));
      tech.style.transform = 'translateY(' + (100 - p * 100) + '%)';
      // lift the headline by roughly half the panel so the meta line clears the rising panel
      if (content) content.style.transform = 'translateY(' + (-p * tech.offsetHeight * 0.42) + 'px)';
    }
    onScrollFrame(update);
    window.addEventListener('resize', update);
    update();
  }

  /* ---------- Scroll reveal (with a safety net so nothing stays hidden) ---------- */
  function initReveal() {
    var els = document.querySelectorAll('.reveal');
    if (!els.length) return;
    if (!('IntersectionObserver' in window)) { els.forEach(function (el) { el.classList.add('visible'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('visible'); io.unobserve(en.target); }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    els.forEach(function (el) { io.observe(el); });
    window.addEventListener('load', function () {
      setTimeout(function () {
        els.forEach(function (el) {
          if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('visible');
        });
      }, 1200);
    });
  }

  /* ---------- The Reality: growth chart, drawn when it scrolls into view ---------- */
  function initRealityChart() {
    var canvas = document.getElementById('reality-chart');
    if (!canvas) return;
    var box = canvas.closest('.chart-box');
    if (typeof window.Chart === 'undefined') {
      // Chart.js loads async from a CDN; retry once everything has loaded, hide the box if it never arrives
      window.addEventListener('load', function () {
        if (typeof window.Chart === 'undefined') { if (box) box.hidden = true; }
        else initRealityChart();
      }, { once: true });
      return;
    }

    var built = false;
    function build() {
      if (built) return; built = true;
      var ctx = canvas.getContext('2d');
      var fill = ctx.createLinearGradient(0, 0, 0, canvas.parentNode.offsetHeight);
      fill.addColorStop(0, 'rgba(134,86,240,0.35)');
      fill.addColorStop(1, 'rgba(42,168,224,0.02)');
      var mono = "'JetBrains Mono', ui-monospace, monospace";

      var chart = new window.Chart(canvas, {
        type: 'line',
        data: {
          labels: ['Year 1', 'Year 2', 'Year 3'],
          datasets: [
            { label: 'With online presence', data: [100, 140, 196], borderColor: '#2AA8E0', backgroundColor: fill, fill: true, tension: 0.45, borderWidth: 2.5, pointRadius: 0, pointHoverRadius: 5, pointHoverBackgroundColor: '#2AA8E0' },
            { label: 'Without online presence', data: [100, 107, 115], borderColor: '#6B6B78', backgroundColor: 'rgba(107,107,120,0.12)', fill: true, tension: 0.45, borderWidth: 2.5, pointRadius: 0, pointHoverRadius: 5, pointHoverBackgroundColor: '#9A9AA6' }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: reduceMotion ? false : { duration: 1400, easing: 'easeOutQuart' },
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#0F0F12', borderColor: '#2D2D38', borderWidth: 1,
              titleColor: '#9A9AA6', bodyColor: '#FFFFFF', padding: 12, usePointStyle: true,
              titleFont: { family: mono, size: 10 }, bodyFont: { family: mono, size: 11 },
              callbacks: {
                label: function (item) {
                  var v = item.raw;
                  return '  ' + item.dataset.label + ': ' + v + (v === 100 ? '  (baseline)' : '  (+' + (v - 100) + '%)');
                }
              }
            }
          },
          scales: {
            x: { grid: { color: '#1C1C22' }, ticks: { color: '#9A9AA6', font: { family: mono, size: 10 } } },
            y: {
              title: { display: true, text: 'Revenue index (Year 1 = 100)', color: '#9A9AA6', font: { family: mono, size: 10 } },
              grid: { color: '#1C1C22' }, ticks: { color: '#9A9AA6', font: { family: mono, size: 10 } }
            }
          }
        }
      });

      var tipOpen = false;
      canvas.addEventListener('click', function (e) {
        e.stopPropagation();
        setTimeout(function () {
          if (tipOpen) { chart.tooltip.setActiveElements([], { x: 0, y: 0 }); chart.update('none'); tipOpen = false; }
          else tipOpen = chart.tooltip.getActiveElements().length > 0;
        }, 0);
      });
      document.addEventListener('click', function () {
        if (tipOpen) { chart.tooltip.setActiveElements([], { x: 0, y: 0 }); chart.update('none'); tipOpen = false; }
      });
    }

    if (!('IntersectionObserver' in window)) { build(); return; }
    var io = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { build(); io.disconnect(); }
    }, { threshold: 0.3 });
    io.observe(canvas);
  }

  /* ---------- FAQ accordion (one open at a time) ---------- */
  function initFaq() {
    var items = document.querySelectorAll('.faq-item');
    items.forEach(function (item) {
      var q = item.querySelector('.faq-q');
      q.addEventListener('click', function () {
        var wasOpen = item.classList.contains('open');
        items.forEach(function (i) { i.classList.remove('open'); i.querySelector('.faq-q').setAttribute('aria-expanded', 'false'); });
        if (!wasOpen) { item.classList.add('open'); q.setAttribute('aria-expanded', 'true'); }
      });
    });
  }

  /* ---------- Contact form: preselect from ?type=, deselectable radios, AJAX submit ---------- */
  function initContactForm() {
    var form = document.getElementById('contact-form');
    if (!form) return;

    var radios = form.querySelectorAll('.choice-input');
    var preset = new URLSearchParams(window.location.search).get('type');
    radios.forEach(function (r) {
      if (preset && r.value.toLowerCase().indexOf(preset) === 0) r.checked = true;
      var label = form.querySelector('label[for="' + r.id + '"]');
      if (!label) return;
      var capture = function () { r._was = r.checked; };
      label.addEventListener('mousedown', capture);
      label.addEventListener('touchstart', capture, { passive: true });
      r.addEventListener('click', function () { if (r._was) { r.checked = false; r._was = false; } });
    });

    var btn = document.getElementById('contact-submit');
    var status = document.getElementById('form-status');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var label = btn.innerHTML;
      btn.disabled = true;
      btn.textContent = 'Sending…';
      status.className = 'form-status';
      status.textContent = 'Sending your inquiry…';

      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = v; });

      fetch('https://formsubmit.co/ajax/tekkzmedia@gmail.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(data)
      }).then(function (res) {
        if (!res.ok) throw new Error('Request failed');
        return res.json();
      }).then(function () {
        form.reset();
        btn.disabled = false; btn.innerHTML = label;
        status.className = 'form-status ok';
        status.textContent = 'Inquiry sent. We will reach out within a day to set up your free call.';
      }).catch(function () {
        btn.disabled = false; btn.innerHTML = label;
        status.className = 'form-status err';
        status.innerHTML = 'That did not go through. Please try again, or email us at <a href="mailto:tekkzmedia@gmail.com">tekkzmedia@gmail.com</a>.';
      });
    });
  }

  /* ---------- Services hero: cells light up around the cursor and cool down ---------- */
  function initHeatGrid() {
    var wrap = document.querySelector('.svc-hero');
    var canvas = document.getElementById('heat-grid');
    if (!wrap || !canvas || !finePointer || reduceMotion) return;
    var ctx = canvas.getContext('2d');
    var CELL = 60, RADIUS = 170, FADE_MS = 1500;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var heat = new Map(), mx = -9999, my = -9999, raf = null, last = 0, w = 0, h = 0;

    function resize() {
      w = wrap.offsetWidth; h = wrap.offsetHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function offset() {
      var r = wrap.getBoundingClientRect();
      return {
        x: (((r.left + window.scrollX) % CELL) + CELL) % CELL,
        y: (((r.top + window.scrollY) % CELL) + CELL) % CELL
      };
    }
    function loop(ts) {
      var dt = Math.min(ts - last, 50); last = ts;
      var decay = dt / FADE_MS;
      heat.forEach(function (v, k) { var n = v - decay; if (n <= 0) heat.delete(k); else heat.set(k, n); });

      var off = offset();
      if (mx !== -9999) {
        var c0 = Math.floor((mx - RADIUS + off.x) / CELL) - 1, c1 = Math.ceil((mx + RADIUS + off.x) / CELL) + 1;
        var r0 = Math.floor((my - RADIUS + off.y) / CELL) - 1, r1 = Math.ceil((my + RADIUS + off.y) / CELL) + 1;
        for (var row = r0; row <= r1; row++) {
          for (var col = c0; col <= c1; col++) {
            var cx = col * CELL - off.x + CELL / 2, cy = row * CELL - off.y + CELL / 2;
            var d = Math.hypot(cx - mx, cy - my);
            if (d >= RADIUS) continue;
            var raw = 1 - d / RADIUS, prox = raw * raw * (3 - 2 * raw), key = col + ',' + row;
            heat.set(key, Math.max(heat.get(key) || 0, prox));
          }
        }
      }

      ctx.clearRect(0, 0, w, h);
      heat.forEach(function (v, key) {
        var parts = key.split(','), col = +parts[0], row = +parts[1];
        var x = col * CELL - off.x, y = row * CELL - off.y;
        var cx = x + CELL / 2, cy = y + CELL / 2;
        var edge = Math.min(Math.min(cx, w - cx, cy, h - cy) / (CELL * 2.5), 1);
        var t = v * edge;
        if (t <= 0.005) return;
        var mix = Math.min(1, Math.max(0, cx / w));
        var rC = Math.round(42 + (134 - 42) * mix), gC = Math.round(168 + (86 - 168) * mix), bC = Math.round(224 + (240 - 224) * mix);
        ctx.fillStyle = 'rgba(' + rC + ',' + gC + ',' + bC + ',' + (t * 0.14).toFixed(3) + ')';
        ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
        ctx.fillStyle = 'rgba(' + rC + ',' + gC + ',' + bC + ',' + (t * 0.6).toFixed(3) + ')';
        ctx.fillRect(x + 1, y + 1, CELL - 2, 2);
        ctx.fillRect(x + 1, y + 1, 2, CELL - 2);
        ctx.fillStyle = 'rgba(0,0,0,' + (t * 0.55).toFixed(3) + ')';
        ctx.fillRect(x + 1, y + CELL - 3, CELL - 2, 2);
        ctx.fillRect(x + CELL - 3, y + 1, 2, CELL - 2);
      });

      if (heat.size || mx !== -9999) raf = requestAnimationFrame(loop); else raf = null;
    }
    function start() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); } }

    wrap.addEventListener('pointermove', function (e) {
      var r = wrap.getBoundingClientRect();
      mx = e.clientX - r.left; my = e.clientY - r.top; start();
    });
    wrap.addEventListener('pointerleave', function () { mx = my = -9999; });
    window.addEventListener('resize', resize);
    resize();
  }

  /* ---------- helper: one rAF-batched scroll callback ---------- */
  function onScrollFrame(fn) {
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { ticking = false; fn(); });
    }, { passive: true });
  }
})();
