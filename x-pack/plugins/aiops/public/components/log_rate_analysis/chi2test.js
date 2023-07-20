/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const t$1e = 'function' === typeof Object.defineProperty ? Object.defineProperty : null;
const e$1f = t$1e;
function r$Q() {
  let t;
  if ('function' !== typeof e$1f) return !1;
  try {
    e$1f({}, 'x', {}), (t = !0);
  } catch (r) {
    t = !1;
  }
  return t;
}
const n$1w = r$Q;
function t$1d(t, r) {
  return null != t && ('symbol' === typeof r ? r in Object(t) : String(r) in Object(t));
}
const n$1v = t$1d;
function o$1g() {
  return 'function' === typeof Symbol && 'symbol' === typeof Symbol('foo');
}
const t$1c = o$1g;
const r$P = t$1c;
const t$1b = r$P();
function a$25() {
  return t$1b && 'symbol' === typeof Symbol.toStringTag;
}
const m$X = a$25;
const r$O = Object.prototype.hasOwnProperty;
function t$1a(t, r) {
  return null != t && r$O.call(t, r);
}
const e$1e = t$1a;
const o$1f = Object.prototype.toString;
const a$24 = o$1f;
function e$1d(t) {
  return a$24.call(t);
}
const n$1u = 'function' === typeof Symbol ? Symbol.toStringTag : '';
const l$M = e$1e;
const c$M = n$1u;
const i$19 = o$1f;
function p$R(t) {
  let r;
  let e;
  let n;
  if (null == t) return i$19.call(t);
  (e = t[c$M]), (r = l$M(t, c$M));
  try {
    t[c$M] = void 0;
  } catch (r) {
    return i$19.call(t);
  }
  return (n = i$19.call(t)), r ? (t[c$M] = e) : delete t[c$M], n;
}
const u$12 = m$X;
const f$1d = e$1d;
const m$W = p$R;
const y$n = u$12() ? m$W : f$1d;
const t$19 = y$n;
function i$18(t) {
  return '[object Array]' === t$19(t);
}
const s$Y = Array.isArray ? Array.isArray : i$18;
const e$1c = s$Y;
const t$18 = e$1c;
function o$1e(t) {
  return 'object' === typeof t && null !== t && !t$18(t);
}
const a$23 = o$1e;
const o$1d = Object.defineProperty;
const a$22 = n$1v;
const _$a = a$23;
const p$Q = Object.prototype;
const i$17 = p$Q.__defineGetter__;
const n$1t = p$Q.__defineSetter__;
const s$X = p$Q.__lookupGetter__;
const l$L = p$Q.__lookupSetter__;
function u$11(t, r, e) {
  let n;
  let $;
  let i;
  let o;
  if (!_$a(t))
    throw new TypeError('invalid argument. First argument must be an object. Value: `' + t + '`.');
  if (!_$a(e))
    throw new TypeError(
      'invalid argument. Property descriptor must be an object. Value: `' + e + '`.'
    );
  if (
    (($ = a$22(e, 'value')) &&
      (s$X.call(t, r) || l$L.call(t, r)
        ? ((n = t.__proto__), (t.__proto__ = p$Q), delete t[r], (t[r] = e.value), (t.__proto__ = n))
        : (t[r] = e.value)),
    (i = a$22(e, 'get')),
    (o = a$22(e, 'set')),
    $ && (i || o))
  )
    throw new Error(
      'invalid argument. Cannot specify one or more accessors and a value or writable attribute in the property descriptor.'
    );
  return i && i$17 && i$17.call(t, r, e.get), o && n$1t && n$1t.call(t, r, e.set), t;
}
const f$1c = n$1w;
const m$V = o$1d;
const d$x = u$11;
const v$C = f$1c() ? m$V : d$x;
const r$N = v$C;
function a$21(t, r, e) {
  r$N(t, r, { configurable: !1, enumerable: !0, writable: !1, value: e });
}
const o$1c = a$21;
const r$M = v$C;
function a$20(t, r, e) {
  r$M(t, r, { configurable: !1, enumerable: !1, writable: !1, value: e });
}
const o$1b = a$20;
const e$1b = Number;
const r$L = e$1b;
function n$1s(t) {
  return 'number' === typeof t;
}
const i$16 = r$L;
const u$10 = i$16.prototype.toString;
const a$1$ = u$10;
function s$W(t) {
  try {
    return a$1$.call(t), !0;
  } catch (t) {
    return !1;
  }
}
const c$L = m$X;
const f$1b = y$n;
const m$U = r$L;
const p$P = s$W;
const l$K = c$L();
function b$v(t) {
  return (
    'object' === typeof t && (t instanceof m$U || (l$K ? p$P(t) : '[object Number]' === f$1b(t)))
  );
}
const j$A = n$1s;
const v$B = b$v;
function y$m(t) {
  return j$A(t) || v$B(t);
}
const d$w = o$1b;
const g$p = y$m;
const h$q = n$1s;
const x$m = b$v;
d$w(g$p, 'isPrimitive', h$q), d$w(g$p, 'isObject', x$m);
const I$c = Number.POSITIVE_INFINITY;
const o$1a = r$L;
const t$17 = o$1a.NEGATIVE_INFINITY;
const a$1_ = Math.floor;
const o$19 = a$1_;
const o$18 = o$19;
function t$16(t) {
  return o$18(t) === t;
}
const a$1Z = t$16;
const o$17 = I$c;
const s$V = t$17;
const a$1Y = a$1Z;
function m$T(t) {
  return t < o$17 && t > s$V && a$1Y(t);
}
const f$1a = g$p.isPrimitive;
const u$$ = m$T;
function p$O(t) {
  return f$1a(t) && u$$(t);
}
const c$K = g$p.isObject;
const v$A = m$T;
function j$z(t) {
  return c$K(t) && v$A(t.valueOf());
}
const l$J = p$O;
const b$u = j$z;
function d$v(t) {
  return l$J(t) || b$u(t);
}
const h$p = o$1b;
const O$a = d$v;
const y$l = p$O;
const P$a = j$z;
h$p(O$a, 'isPrimitive', y$l), h$p(O$a, 'isObject', P$a);
const i$15 = O$a.isPrimitive;
function t$15(t) {
  return i$15(t) && t >= 0;
}
const n$1r = O$a.isObject;
function o$16(t) {
  return n$1r(t) && t.valueOf() >= 0;
}
const u$_ = t$15;
const a$1X = o$16;
function f$19(t) {
  return u$_(t) || a$1X(t);
}
const s$U = o$1b;
const m$S = f$19;
const v$z = t$15;
const c$J = o$16;
s$U(m$S, 'isPrimitive', v$z), s$U(m$S, 'isObject', c$J);
const a$1W = 4294967295;
const e$1a = a$1Z;
const n$1q = a$1W;
function a$1V(t) {
  return (
    null != t &&
    'function' !== typeof t &&
    'number' === typeof t.length &&
    e$1a(t.length) &&
    t.length >= 0 &&
    t.length <= n$1q
  );
}
const o$15 = a$1V;
const n$1p = o$15;
function t$14(t) {
  if ('function' !== typeof t)
    throw new TypeError('invalid argument. Must provide a function. Value: `' + t + '`.');
  return function (r) {
    let e;
    let n;
    if (!n$1p(r)) return !1;
    if (0 === (e = r.length)) return !1;
    for (n = 0; n < e; n++) if (!1 === t(r[n])) return !1;
    return !0;
  };
}
const e$19 = t$14;
const o$14 = m$S;
const t$13 = o$1b;
const n$1o = e$19;
const s$T = n$1o(o$14);
function t$12(t) {
  return (
    null !== t &&
    'object' === typeof t &&
    'object' === typeof t.data &&
    'object' === typeof t.shape &&
    'object' === typeof t.strides &&
    'number' === typeof t.offset &&
    'string' === typeof t.order &&
    'number' === typeof t.ndims &&
    'string' === typeof t.dtype &&
    'number' === typeof t.length &&
    'object' === typeof t.flags &&
    'function' === typeof t.get &&
    'function' === typeof t.set
  );
}
t$13(s$T, 'primitives', n$1o(o$14.isPrimitive)), t$13(s$T, 'objects', n$1o(o$14.isObject));
const e$18 = t$12;
const e$17 = e$18;
function t$11(t) {
  return e$17(t) && 2 === t.ndims && 2 === t.shape.length && 2 === t.strides.length;
}
const n$1n = t$11;
const n$1m = e$1c;
function t$10(t) {
  if ('function' !== typeof t)
    throw new TypeError('invalid argument. Must provide a function. Value: `' + t + '`.');
  return function (r) {
    let e;
    let n;
    if (!n$1m(r)) return !1;
    if (0 === (e = r.length)) return !1;
    for (n = 0; n < e; n++) if (!1 === t(r[n])) return !1;
    return !0;
  };
}
const e$16 = t$10;
const a$1U = e$16;
const t$$ = e$1c;
const f$18 = a$1U(t$$);
const i$14 = f$18;
function e$15(t) {
  return 'boolean' === typeof t;
}
const n$1l = Boolean.prototype.toString;
const i$13 = n$1l;
function a$1T(t) {
  try {
    return i$13.call(t), !0;
  } catch (t) {
    return !1;
  }
}
const u$Z = m$X;
const s$S = y$n;
const c$I = a$1T;
const f$17 = u$Z();
function l$I(t) {
  return (
    'object' === typeof t &&
    (t instanceof Boolean || (f$17 ? c$I(t) : '[object Boolean]' === s$S(t)))
  );
}
const p$N = e$15;
const m$R = l$I;
function j$y(t) {
  return p$N(t) || m$R(t);
}
const v$y = o$1b;
const y$k = j$y;
const b$t = e$15;
const d$u = l$I;
function r$K() {
  return new Function('return this;')();
}
v$y(y$k, 'isPrimitive', b$t), v$y(y$k, 'isObject', d$u);
const o$13 = 'object' === typeof self ? self : null;
const t$_ = 'object' === typeof window ? window : null;
const n$1k = 'object' === typeof global ? global : null;
const i$12 = y$k.isPrimitive;
const l$H = r$K;
const u$Y = o$13;
const f$16 = t$_;
const a$1S = n$1k;
function b$s(t) {
  if (arguments.length) {
    if (!i$12(t))
      throw new TypeError(
        'invalid argument. Must provide a boolean primitive. Value: `' + t + '`.'
      );
    if (t) return l$H();
  }
  if (u$Y) return u$Y;
  if (f$16) return f$16;
  if (a$1S) return a$1S;
  throw new Error('unexpected error. Unable to resolve global object.');
}
const s$R = b$s;
const t$Z = /^\s*function\s*([^(]*)/i;
function o$12(t) {
  return null !== t && 'object' === typeof t;
}
const t$Y = o$1b;
const n$1j = e$16;
const i$11 = o$12;
t$Y(i$11, 'isObjectLikeArray', n$1j(i$11));
const t$X = i$11;
function o$11(t) {
  return (
    t$X(t) &&
    (t._isBuffer ||
      (t.constructor && 'function' === typeof t.constructor.isBuffer && t.constructor.isBuffer(t)))
  );
}
const f$15 = o$11;
const o$10 = y$n;
const n$1i = t$Z;
const f$14 = f$15;
function i$10(t) {
  let r;
  let e;
  let n;
  if (('Object' === (e = o$10(t).slice(8, -1)) || 'Error' === e) && t.constructor) {
    if ('string' === typeof (n = t.constructor).name) return n.name;
    if ((r = n$1i.exec(n.toString()))) return r[1];
  }
  return f$14(t) ? 'Buffer' : e;
}
const s$Q = i$10;
const r$J = /./;
const n$1h = s$R;
const e$14 = n$1h();
const u$X = e$14.document && e$14.document.childNodes;
const c$H = Int8Array;
const f$13 = r$J;
const a$1R = u$X;
const i$$ = c$H;
function l$G() {
  return 'function' === typeof f$13 || 'object' === typeof i$$ || 'function' === typeof a$1R;
}
const m$Q = s$Q;
function p$M(t) {
  let r;
  return null === t ? 'null' : 'object' == (r = typeof t) ? m$Q(t).toLowerCase() : r;
}
const s$P = s$Q;
function d$t(t) {
  return s$P(t).toLowerCase();
}
const v$x = l$G;
const y$j = p$M;
const j$x = d$t;
const b$r = v$x() ? j$x : y$j;
const r$I = b$r;
function o$$(t) {
  return 'function' === r$I(t);
}
const f$12 = o$$;
const r$H = Object.getPrototypeOf;
function n$1g(t) {
  return t.__proto__;
}
const e$13 = y$n;
const c$G = n$1g;
function u$W(t) {
  const r = c$G(t);
  return r || null === r
    ? r
    : '[object Function]' === e$13(t.constructor)
    ? t.constructor.prototype
    : t instanceof Object
    ? Object.prototype
    : null;
}
const f$11 = f$12;
const i$_ = r$H;
const l$F = u$W;
const p$L = f$11(Object.getPrototypeOf) ? i$_ : l$F;
const s$O = p$L;
function j$w(t) {
  return null == t ? null : ((t = Object(t)), s$O(t));
}
const O$9 = j$w;
const s$N = a$23;
const c$F = f$12;
const e$12 = O$9;
const f$10 = e$1e;
const p$K = y$n;
const u$V = Object.prototype;
function m$P(t) {
  let r;
  for (r in t) if (!f$10(t, r)) return !1;
  return !0;
}
function a$1Q(t) {
  let r;
  return (
    !!s$N(t) &&
    (!(r = e$12(t)) ||
      (!f$10(t, 'constructor') &&
        f$10(r, 'constructor') &&
        c$F(r.constructor) &&
        '[object Function]' === p$K(r.constructor) &&
        f$10(r, 'isPrototypeOf') &&
        c$F(r.isPrototypeOf) &&
        (r === u$V || m$P(t))))
  );
}
const j$v = a$1Q;
function r$G(t, r, e) {
  let n;
  let $;
  let i;
  if (((n = r.length), ($ = 1), 'column-major' === e))
    for (i = 0; i < n; i++) (t[i] = $), ($ *= r[i]);
  else for (i = n - 1; i >= 0; i--) (t[i] = $), ($ *= r[i]);
  return t;
}
const n$1f = r$G;
function e$11(t, r, e) {
  return 2 === arguments.length ? n$1f(new Array(t.length), t, r) : n$1f(t, r, e);
}
const t$W = e$11;
function r$F(t, r) {
  let e;
  let n;
  let $;
  for (n = t.length, e = 0, $ = 0; $ < n; $++) r[$] < 0 && (e -= r[$] * (t[$] - 1));
  return e;
}
const t$V = r$F;
function r$E(t) {
  return t < 0 ? -t : 0 === t ? 0 : t;
}
const t$U = r$E;
const o$_ = t$U;
function n$1e(t) {
  let r;
  let e;
  let n;
  let $;
  let i;
  let o;
  if (0 === (e = t.length)) return 'none';
  for (r = !0, n = !0, $ = o$_(t[0]), o = 1; o < e; o++) {
    if (((i = o$_(t[o])), r && i < $ ? (r = !1) : n && i > $ && (n = !1), !n && !r)) return 'none';
    $ = i;
  }
  return n && r ? 'both' : n ? 'row-major' : 'column-major';
}
const a$1P = n$1e;
function r$D(t) {
  let r;
  let e;
  let n;
  if (0 === (r = t.length)) return 0;
  for (e = 1, n = 0; n < r; n++) e *= t[n];
  return e;
}
const t$T = r$D;
const r$C = a$1Z;
const n$1d = a$1W;
function a$1O(t) {
  return (
    'object' === typeof t &&
    null !== t &&
    'number' === typeof t.length &&
    r$C(t.length) &&
    t.length >= 0 &&
    t.length <= n$1d
  );
}
const o$Z = a$1O;
const a$1N = 9007199254740991;
const r$B = m$S.isPrimitive;
const n$1c = a$1N;
function o$Y(t) {
  return (
    null !== t &&
    'object' === typeof t &&
    r$B(t.length) &&
    t.length <= n$1c &&
    'number' === typeof t.BYTES_PER_ELEMENT &&
    'number' === typeof t.byteOffset &&
    'number' === typeof t.byteLength
  );
}
const a$1M = o$Y;
const i$Z = O$a.isPrimitive;
function t$S(t) {
  return i$Z(t) && t > 0;
}
const n$1b = O$a.isObject;
function o$X(t) {
  return n$1b(t) && t.valueOf() > 0;
}
const u$U = t$S;
const a$1L = o$X;
function f$$(t) {
  return u$U(t) || a$1L(t);
}
const s$M = o$1b;
const m$O = f$$;
const v$w = t$S;
const c$E = o$X;
s$M(m$O, 'isPrimitive', v$w), s$M(m$O, 'isObject', c$E);
const o$W = O$a;
const t$R = o$1b;
const s$L = e$19;
const m$N = s$L(o$W);
t$R(m$N, 'primitives', s$L(o$W.isPrimitive)), t$R(m$N, 'objects', s$L(o$W.isObject));
const r$A = ['row-major', 'column-major'];
const o$V = r$A;
function a$1K() {
  return o$V.slice();
}
const e$10 = a$1K;
const t$Q = e$10;
const e$$ = t$Q();
const o$U = e$$.length;
function f$_(t) {
  let r;
  for (r = 0; r < o$U; r++) if (t === e$$[r]) return !0;
  return !1;
}
const n$1a = f$_;
const t$P = [
  'binary',
  'float32',
  'float64',
  'generic',
  'int16',
  'int32',
  'int8',
  'uint16',
  'uint32',
  'uint8',
  'uint8c',
];
const n$19 = t$P;
function i$Y() {
  return n$19.slice();
}
const r$z = i$Y;
const t$O = r$z;
const e$_ = t$O();
const f$Z = e$_.length;
function n$18(t) {
  let r;
  for (r = 0; r < f$Z; r++) if (t === e$_[r]) return !0;
  return !1;
}
const o$T = n$18;
function r$y(t, r, e, n) {
  let $;
  let i;
  let o;
  let a;
  for ($ = r.length, i = n, o = n, a = 0; a < $; a++)
    e[a] > 0 ? (o += e[a] * (r[a] - 1)) : e[a] < 0 && (i += e[a] * (r[a] - 1));
  return (t[0] = i), (t[1] = o), t;
}
const n$17 = r$y;
function t$N(t, r, e, n) {
  return 3 === arguments.length ? n$17(new Array(2), t, r, e) : n$17(t, r, e, n);
}
const e$Z = t$N;
const e$Y = e$Z;
const f$Y = [0, 0];
function i$X(t, r, e, n) {
  return e$Y(f$Y, r, e, n), f$Y[0] >= 0 && f$Y[1] < t;
}
const n$16 = i$X;
const n$15 = 1;
const t$M = 8;
const i$W = 4;
const u$T = null;
const l$E = 2;
const r$x = 4;
const a$1J = 1;
const e$X = 2;
const f$X = 4;
const o$S = 1;
const c$D = 1;
const v$v = {
  binary: n$15,
  float64: t$M,
  float32: i$W,
  generic: u$T,
  int16: l$E,
  int32: r$x,
  int8: a$1J,
  uint16: e$X,
  uint32: f$X,
  uint8: o$S,
  uint8c: c$D,
};
const b$q = v$v;
function d$s(t) {
  return b$q[t] || null;
}
const g$o = d$s;
const r$w = v$C;
function o$R(t, r, e) {
  r$w(t, r, { configurable: !1, enumerable: !1, get: e });
}
const t$L = o$R;
function r$v(t) {
  let r;
  let e;
  for (r = 0, e = 0; e < t.length; e++) t[e] < 0 && (r += 1);
  return 0 === r ? 1 : r === t.length ? -1 : 0;
}
const t$K = r$v;
function e$W(t) {
  return 'string' === typeof t;
}
const o$Q = String.prototype.valueOf;
const i$V = o$Q;
function a$1I(t) {
  try {
    return i$V.call(t), !0;
  } catch (t) {
    return !1;
  }
}
const u$S = m$X;
const s$K = y$n;
const f$W = a$1I;
const c$C = u$S();
function p$J(t) {
  return (
    'object' === typeof t && (t instanceof String || (c$C ? f$W(t) : '[object String]' === s$K(t)))
  );
}
const l$D = e$W;
const m$M = p$J;
function v$u(t) {
  return l$D(t) || m$M(t);
}
const g$n = o$1b;
const j$u = v$u;
const y$i = e$W;
const b$p = p$J;
g$n(j$u, 'isPrimitive', y$i), g$n(j$u, 'isObject', b$p);
const e$V = j$u.isPrimitive;
const i$U = /[-\/\\^$*+?.()|[\]{}]/g;
function t$J(t) {
  let r;
  let e;
  if (!e$V(t))
    throw new TypeError(
      'invalid argument. Must provide a regular expression string. Value: `' + t + '`.'
    );
  if ('/' === t[0]) for (e = t.length - 1; e >= 0 && '/' !== t[e]; e--);
  return void 0 === e || e <= 0
    ? t.replace(i$U, '\\$&')
    : ((r = (r = t.substring(1, e)).replace(i$U, '\\$&')), (t = t[0] + r + t.substring(e)));
}
const s$J = t$J;
const e$U = RegExp.prototype.exec;
const o$P = e$U;
function a$1H(t) {
  try {
    return o$P.call(t), !0;
  } catch (t) {
    return !1;
  }
}
const n$14 = m$X;
const p$I = y$n;
const c$B = a$1H;
const s$I = n$14();
function i$T(t) {
  return (
    'object' === typeof t && (t instanceof RegExp || (s$I ? c$B(t) : '[object RegExp]' === p$I(t)))
  );
}
const u$R = i$T;
const n$13 = s$J;
const s$H = f$12;
const a$1G = j$u.isPrimitive;
const m$L = u$R;
function o$O(t, r, e) {
  if (!a$1G(t))
    throw new TypeError(
      'invalid argument. First argument must be a string primitive. Value: `' + t + '`.'
    );
  if (a$1G(r)) (r = n$13(r)), (r = new RegExp(r, 'g'));
  else if (!m$L(r))
    throw new TypeError(
      'invalid argument. Second argument must be a string primitive or regular expression. Value: `' +
        r +
        '`.'
    );
  if (!a$1G(e) && !s$H(e))
    throw new TypeError(
      'invalid argument. Third argument must be a string primitive or replacement function. Value: `' +
        e +
        '`.'
    );
  return t.replace(r, e);
}
const u$Q = o$O;
function h$o(t, r) {
  return r && ('column-major' === t || 'both' === t);
}
function a$1F(t, r) {
  return r && ('row-major' === t || 'both' === t);
}
const u$P = e$Z;
const _$9 = [0, 0];
function d$r(t, r, e, n, $) {
  return 0 !== t && 0 !== $ && (u$P(_$9, r, e, n), t === _$9[1] - _$9[0] + 1);
}
const p$H = o$1c;
function c$A(t) {
  const r = {};
  return (
    p$H(r, 'ROW_MAJOR_CONTIGUOUS', t.ROW_MAJOR_CONTIGUOUS),
    p$H(r, 'COLUMN_MAJOR_CONTIGUOUS', t.COLUMN_MAJOR_CONTIGUOUS),
    r
  );
}
function y$h(t) {
  let r;
  let e;
  const n = t - 1;
  for (r = 'return function set(', e = 0; e < t; e++) r += 'i' + e + ',';
  for (r += 'v){', r += 'this._buffer[this._offset+', e = 0; e < t; e++)
    (r += 'this._strides[' + e + ']*i' + e), e < n && (r += '+');
  return (
    (r += ']'),
    (r += '=v;'),
    (r += 'return this;'),
    (r += '}'),
    (r += '//# sourceURL=ndarray.ctor.set.js'),
    new Function(r)()
  );
}
function l$C(t) {
  let r;
  let e;
  const n = t - 1;
  for (r = 'return function get(', e = 0; e < t; e++) (r += 'i' + e), e < n && (r += ',');
  for (r += '){', r += 'return this._buffer[this._offset+', e = 0; e < t; e++)
    (r += 'this._strides[' + e + ']*i' + e), e < n && (r += '+');
  return (r += '];'), (r += '}'), (r += '//# sourceURL=ndarray.ctor.get.js'), new Function(r)();
}
function g$m(t) {
  let r;
  let e;
  let n;
  let $;
  let i;
  let o;
  if (1 === this._iterationOrder) return this._buffer[this._offset + t];
  if (-1 === this._iterationOrder) return this._buffer[this._offset - t];
  if (
    ((e = this._shape),
    (n = this._shape.length),
    (r = this._strides),
    ($ = this._offset),
    'column-major' === this._order)
  ) {
    for (o = 0; o < n; o++) (t -= i = t % e[o]), (t /= e[o]), ($ += i * r[o]);
    return this._buffer[$];
  }
  for (o = n - 1; o >= 0; o--) (t -= i = t % e[o]), (t /= e[o]), ($ += i * r[o]);
  return this._buffer[$];
}
function m$K(t, r) {
  let e;
  let n;
  let $;
  let i;
  let o;
  let a;
  if (1 === this._iterationOrder) return (this._buffer[this._offset + t] = r), this;
  if (-1 === this._iterationOrder) return (this._buffer[this._offset - t] = r), this;
  if (
    ((n = this._shape),
    ($ = this._shape.length),
    (e = this._strides),
    (i = this._offset),
    'column-major' === this._order)
  ) {
    for (a = 0; a < $; a++) (t -= o = t % n[a]), (t /= n[a]), (i += o * e[a]);
    return (this._buffer[i] = r), this;
  }
  for (a = $ - 1; a >= 0; a--) (t -= o = t % n[a]), (t /= n[a]), (i += o * e[a]);
  return (this._buffer[i] = r), this;
}
function O$8() {
  let t;
  let r;
  for (t = this._offset, r = 0; r < arguments.length - 1; r++) t += this._strides[r] * arguments[r];
  return (this._buffer[t] = arguments[r]), this;
}
function E$b() {
  let t;
  let r;
  for (t = this._offset, r = 0; r < arguments.length; r++) t += this._strides[r] * arguments[r];
  return this._buffer[t];
}
function b$o() {
  let t;
  let r;
  let e;
  for (
    r = this._length,
      (t = {}).type = 'ndarray',
      t.dtype = this.dtype,
      t.flags = {},
      t.order = this._order,
      t.shape = this._shape.slice(),
      t.strides = this._strides.slice(),
      e = 0;
    e < r;
    e++
  )
    t.strides[e] < 0 && (t.strides[e] *= -1);
  for (t.data = [], e = 0; e < r; e++) t.data.push(this.iget(e));
  return t;
}
const U$a = u$Q;
const v$t = {
  int8: 'new Int8Array( [ {{data}} ] )',
  uint8: 'new Uint8Array( [ {{data}} ] )',
  uint8c: 'new Uint8ClampedArray( [ {{data}} ] )',
  int16: 'new Int16Array( [ {{data}} ] )',
  uint16: 'new Uint16Array( [ {{data}} ] )',
  int32: 'new Int32Array( [ {{data}} ] )',
  uint32: 'new Uint32Array( [ {{data}} ] )',
  float32: 'new Float32Array( [ {{data}} ] )',
  float64: 'new Float64Array( [ {{data}} ] )',
  generic: '[ {{data}} ]',
  binary: 'new Buffer( [ {{data}} ] )',
};
function R$8() {
  let t;
  let r;
  let e;
  let n;
  let $;
  if (((r = this._shape.length), (n = 'ndarray( '), (t = ''), this._length <= 100))
    for ($ = 0; $ < this._length; $++) (t += this.iget($)), $ < this._length - 1 && (t += ', ');
  else {
    for ($ = 0; $ < 3; $++) (t += this.iget($)), $ < 2 && (t += ', ');
    for (t += ', ..., ', $ = 2; $ >= 0; $--)
      (t += this.iget(this._length - 1 - $)), $ > 0 && (t += ', ');
  }
  for (
    e = v$t[this.dtype],
      n += U$a(e, '{{data}}', t),
      n += ', ',
      n += '[ ' + this._shape.join(', ') + ' ]',
      n += ', ',
      n += '[ ',
      $ = 0;
    $ < r;
    $++
  )
    this._strides[$] < 0 ? (n += -this._strides[$]) : (n += this._strides[$]),
      $ < r - 1 && (n += ', ');
  return (n += ' ]'), (n += ', '), (n += '0'), (n += ', '), (n += "'" + this._order + "'") + ' )';
}
const T$8 = !0;
const j$t = { codegen: T$8 };
const w$i = o$1b;
const A$e = t$L;
const N$f = g$o;
const M$9 = t$K;
const L$a = a$1P;
const S$8 = h$o;
const C$d = a$1F;
const I$b = d$r;
const J$a = c$A;
const B$d = y$h;
const G$b = l$C;
const P$9 = g$m;
const Y$8 = m$K;
const F$d = O$8;
const x$l = E$b;
const W$8 = b$o;
const k$m = R$8;
const q$f = j$t;
function z$b(t, r, e) {
  const n = {};
  function $(t, e, n, i, o) {
    let a;
    let u;
    let f;
    let s;
    let c;
    if (!(this instanceof $)) return new $(t, e, n, i, o);
    for (s = 1, c = 0; c < r; c++) s *= e[c];
    return (
      (u = $.BYTES_PER_ELEMENT ? $.BYTES_PER_ELEMENT * s : null),
      (this._byteLength = u),
      (this._buffer = t),
      (this._length = s),
      (this._offset = i),
      (this._order = o),
      (this._shape = e),
      (this._strides = n),
      (this._iterationOrder = M$9(n)),
      (a = I$b(s, e, n, i, this._iterationOrder)),
      (f = L$a(n)),
      (this._flags = { ROW_MAJOR_CONTIGUOUS: C$d(f, a), COLUMN_MAJOR_CONTIGUOUS: S$8(f, a) }),
      this
    );
  }
  return (
    (n.codegen =
      arguments.length > 2 ? (void 0 === e.codegen ? q$f.codegen : e.codegen) : q$f.codegen),
    w$i($, 'BYTES_PER_ELEMENT', N$f(t)),
    w$i($, 'dtype', t),
    w$i($, 'ndims', r),
    A$e($.prototype, 'byteLength', function () {
      return this._byteLength;
    }),
    w$i($.prototype, 'BYTES_PER_ELEMENT', $.BYTES_PER_ELEMENT),
    A$e($.prototype, 'data', function () {
      return this._buffer;
    }),
    w$i($.prototype, 'dtype', $.dtype),
    A$e($.prototype, 'flags', function () {
      return J$a(this._flags);
    }),
    A$e($.prototype, 'length', function () {
      return this._length;
    }),
    w$i($.prototype, 'ndims', r),
    A$e($.prototype, 'offset', function () {
      return this._offset;
    }),
    A$e($.prototype, 'order', function () {
      return this._order;
    }),
    A$e($.prototype, 'shape', function () {
      return this._shape.slice();
    }),
    A$e($.prototype, 'strides', function () {
      return this._strides.slice();
    }),
    w$i($.prototype, 'get', n.codegen ? G$b(r) : x$l),
    w$i($.prototype, 'iget', P$9),
    w$i($.prototype, 'set', n.codegen ? B$d(r) : F$d),
    w$i($.prototype, 'iset', Y$8),
    w$i($.prototype, 'toString', k$m),
    w$i($.prototype, 'toJSON', W$8),
    $
  );
}
const D$c = z$b;
const n$12 = !0;
const o$N = { codegen: n$12 };
const t$I = ['codegen'];
const g$l = t$I;
const c$z = g$l.length;
const d$q = c$z - 1;
function f$V(t, r) {
  let e;
  let n;
  for (e = t + ';', n = 0; n < c$z; n++) (e += g$l[n] + '=' + r[g$l[n]]), n < d$q && (e += ',');
  return e;
}
const u$O = ['codegen=true', 'codegen=false'];
const a$1E = r$z;
const l$B = u$O;
const v$s = a$1E();
const h$n = v$s.length;
const i$S = l$B.length;
function s$G() {
  let t;
  let r;
  let e;
  let n;
  for (t = {}, e = 0; e < h$n; e++) for (r = v$s[e], n = 0; n < i$S; n++) t[r + ';' + l$B[n]] = [];
  return t;
}
const p$G = D$c;
const m$J = o$N;
const j$s = f$V;
const x$k = s$G;
const y$g = x$k();
function b$n(t, r, e) {
  let n;
  let $;
  let i;
  let o;
  let a;
  let u;
  if (
    ((($ = {}).codegen =
      arguments.length > 2 ? (void 0 === e.codegen ? m$J.codegen : e.codegen) : m$J.codegen),
    (i = j$s(t, $)),
    r <= (o = (n = y$g[i]).length))
  )
    !1 === (a = n[r - 1]) && ((a = p$G(t, r, $)), (n[r - 1] = a));
  else {
    for (u = o + 1; u < r; u++) n.push(!1);
    (a = p$G(t, r, $)), n.push(a);
  }
  return a;
}
const k$l = b$n;
function e$T(t) {
  const r = typeof t;
  return null === t || ('object' !== r && 'function' !== r)
    ? new TypeError(
        'invalid argument. A provided constructor must be either an object (except null) or a function. Value: `' +
          t +
          '`.'
      )
    : null;
}
const r$u = Object.create;
function o$M() {}
function n$11(t) {
  return (o$M.prototype = t), new o$M();
}
const i$R = n$11;
const p$F = 'function' === typeof r$u ? r$u : i$R;
const c$y = v$C;
const f$U = e$T;
const l$A = p$F;
function y$f(t, r) {
  let e = f$U(t);
  if (e) throw e;
  if ((e = f$U(r))) throw e;
  if (void 0 === r.prototype)
    throw new TypeError(
      'invalid argument. Second argument must have a prototype from which another object can inherit. Value: `' +
        r.prototype +
        '`.'
    );
  return (
    (t.prototype = l$A(r.prototype)),
    c$y(t.prototype, 'constructor', { configurable: !0, enumerable: !1, writable: !0, value: t }),
    t
  );
}
const v$r = y$f;
function r$t(t, r) {
  return t < 0 ? 0 : t > r ? r : t;
}
const t$H = r$t;
function r$s(t, r) {
  const e = r + 1;
  return t < 0
    ? ((t += e) < 0 && 0 != (t %= e) && (t += e), t)
    : t > r
    ? ((t -= e) > r && (t %= e), t)
    : t;
}
const t$G = r$s;
const n$10 = t$H;
const t$F = t$G;
function a$1D(t, r, e) {
  if ('clamp' === e) return n$10(t, r);
  if ('wrap' === e) return t$F(t, r);
  if (t < 0 || t > r)
    throw new RangeError(
      'invalid argument. Index must be on the interval: [0,' + r + ']. Value: `' + t + '`.'
    );
  return t;
}
const i$Q = a$1D;
const r$r = ['throw', 'clamp', 'wrap'];
const a$1C = r$r;
function t$E() {
  return a$1C.slice();
}
const e$S = t$E;
const e$R = e$S;
const t$D = e$R();
const n$$ = t$D.length;
function o$L(t) {
  let r;
  for (r = 0; r < n$$; r++) if (t === t$D[r]) return !0;
  return !1;
}
const f$T = o$L;
const codegen = !0;
const mode = 'throw';
const __var_14__ = { codegen: codegen, mode: mode };
const isInteger = O$a.isPrimitive;
const getIndex = i$Q;
function wrap(t, r) {
  return function (e) {
    if (!isInteger(e))
      throw new TypeError('invalid argument. Index must be an integer value. Value: `' + e + '`.');
    return (e = getIndex(e, this._length - 1, r)), t.call(this, e);
  };
}
const isInteger$1 = O$a.isPrimitive;
const getIndex$1 = i$Q;
function wrap$1(t, r) {
  return function (e, n) {
    if (!isInteger$1(e))
      throw new TypeError('invalid argument. Index must be an integer value. Value: `' + e + '`.');
    return (e = getIndex$1(e, this._length - 1, r)), t.call(this, e, n), this;
  };
}
const isInteger$2 = O$a.isPrimitive;
const getIndex$2 = i$Q;
function get(ndims, mode) {
  const n = ndims - 1;
  let f;
  let i;
  for (f = '(function iife(){return function get(', i = 0; i < ndims; i++)
    (f += 'i' + i), i < n && (f += ',');
  for (f += '){', i = 0; i < ndims; i++)
    f +=
      'if(!f.__isint__(i' +
      i +
      ")){throw new TypeError('invalid argument. Indices must be integer valued. Argument: " +
      i +
      ". Value: `'+i" +
      i +
      "+'`.');}";
  for (i = 0; i < ndims; i++)
    f +=
      'i' +
      i +
      '=f.__get_index__(i' +
      i +
      ',this._shape[' +
      i +
      "]-1,'" +
      mode[i % mode.length] +
      "');";
  for (f += 'return this._buffer[this._offset+', i = 0; i < ndims; i++)
    (f += 'this._strides[' + i + ']*i' + i), i < n && (f += '+');
  return (
    (f += '];'),
    (f += '}'),
    (f += '})()'),
    (f += '//# sourceURL=ndarray.ctor.get.js'),
    (f = eval(f)),
    (f.__isint__ = isInteger$2),
    (f.__get_index__ = getIndex$2),
    f
  );
}
const isInteger$3 = O$a.isPrimitive;
const getIndex$3 = i$Q;
function wrap$2(t) {
  return (
    (t = t[0]),
    function (r) {
      if (!isInteger$3(r))
        throw new TypeError(
          'invalid argument. Index must be an integer value. Value: `' + r + '`.'
        );
      return (
        (r = getIndex$3(r, this._shape[0] - 1, t)),
        this._buffer[this._offset + this._strides[0] * r]
      );
    }
  );
}
const isInteger$4 = O$a.isPrimitive;
const getIndex$4 = i$Q;
function wrap$3(t) {
  const r = t[0 % t.length];
  const e = t[1 % t.length];
  return function (t, n) {
    let $;
    if (!isInteger$4(t))
      throw new TypeError(
        'invalid argument. Index for first dimension must be an integer value. Value: `' + t + '`.'
      );
    if (!isInteger$4(n))
      throw new TypeError(
        'invalid argument. Index for second dimension must be an integer value. Value: `' + n + '`.'
      );
    return (
      (t = getIndex$4(t, this._shape[0] - 1, r)),
      (n = getIndex$4(n, this._shape[1] - 1, e)),
      ($ = this._offset + this._strides[0] * t + this._strides[1] * n),
      this._buffer[$]
    );
  };
}
const isInteger$5 = O$a.isPrimitive;
const getIndex$5 = i$Q;
function wrap$4(t) {
  const r = t[0 % t.length];
  const e = t[1 % t.length];
  const n = t[2 % t.length];
  return function (t, $, i) {
    let o;
    if (!isInteger$5(t))
      throw new TypeError(
        'invalid argument. Index for first dimension must be an integer value. Value: `' + t + '`.'
      );
    if (!isInteger$5($))
      throw new TypeError(
        'invalid argument. Index for second dimension must be an integer value. Value: `' + $ + '`.'
      );
    if (!isInteger$5(i))
      throw new TypeError(
        'invalid argument. Index for third dimension must be an integer value. Value: `' + i + '`.'
      );
    return (
      (t = getIndex$5(t, this._shape[0] - 1, r)),
      ($ = getIndex$5($, this._shape[1] - 1, e)),
      (i = getIndex$5(i, this._shape[2] - 1, n)),
      (o = this._offset + this._strides[0] * t + this._strides[1] * $ + this._strides[2] * i),
      this._buffer[o]
    );
  };
}
const isInteger$6 = O$a.isPrimitive;
const getIndex$6 = i$Q;
function wrap$5(t) {
  const r = t[0 % t.length];
  const e = t[1 % t.length];
  const n = t[2 % t.length];
  const $ = t[3 % t.length];
  return function (t, i, o, a) {
    let u;
    if (!isInteger$6(t))
      throw new TypeError(
        'invalid argument. Index for first dimension must be an integer value. Value: `' + t + '`.'
      );
    if (!isInteger$6(i))
      throw new TypeError(
        'invalid argument. Index for second dimension must be an integer value. Value: `' + i + '`.'
      );
    if (!isInteger$6(o))
      throw new TypeError(
        'invalid argument. Index for third dimension must be an integer value. Value: `' + o + '`.'
      );
    if (!isInteger$6(a))
      throw new TypeError(
        'invalid argument. Index for fourth dimension must be an integer value. Value: `' + a + '`.'
      );
    return (
      (t = getIndex$6(t, this._shape[0] - 1, r)),
      (i = getIndex$6(i, this._shape[1] - 1, e)),
      (o = getIndex$6(o, this._shape[2] - 1, n)),
      (a = getIndex$6(a, this._shape[3] - 1, $)),
      (u =
        this._offset +
        this._strides[0] * t +
        this._strides[1] * i +
        this._strides[2] * o +
        this._strides[3] * a),
      this._buffer[u]
    );
  };
}
const isInteger$7 = O$a.isPrimitive;
const getIndex$7 = i$Q;
function wrap$6(t) {
  const r = t.length;
  return function () {
    let e;
    let n;
    let $;
    let i;
    for (e = arguments.length, n = this._offset, i = 0; i < e; i++) {
      if (!isInteger$7(arguments[i]))
        throw new TypeError(
          'invalid argument. Indices must be integer valued. Argument: ' +
            i +
            '. Value: `' +
            arguments[i] +
            '`.'
        );
      ($ = getIndex$7(arguments[i], this._shape[i] - 1, t[i % r])), (n += this._strides[i] * $);
    }
    return this._buffer[n];
  };
}
const compile = get;
const get1d = wrap$2;
const get2d = wrap$3;
const get3d = wrap$4;
const get4d = wrap$5;
const getnd = wrap$6;
function get$1(t, r, e) {
  return r
    ? compile(t, e)
    : 1 === t
    ? get1d(e)
    : 2 === t
    ? get2d(e)
    : 3 === t
    ? get3d(e)
    : 4 === t
    ? get4d(e)
    : getnd(e);
}
const isInteger$8 = O$a.isPrimitive;
const getIndex$8 = i$Q;
function set(ndims, mode) {
  const n = ndims - 1;
  let f;
  let i;
  for (f = '(function iife(){return function set(', i = 0; i < ndims; i++) f += 'i' + i + ',';
  for (f += 'v){', i = 0; i < ndims; i++)
    f +=
      'if(!f.__isint__(i' +
      i +
      ")){throw new TypeError('invalid argument. Indices must be integer valued. Argument: " +
      i +
      ". Value: `'+i" +
      i +
      "+'`.');}";
  for (i = 0; i < ndims; i++)
    f +=
      'i' +
      i +
      '=f.__get_index__(i' +
      i +
      ',this._shape[' +
      i +
      "]-1,'" +
      mode[i % mode.length] +
      "');";
  for (f += 'this._buffer[this._offset+', i = 0; i < ndims; i++)
    (f += 'this._strides[' + i + ']*i' + i), i < n && (f += '+');
  return (
    (f += ']=v;'),
    (f += 'return this;'),
    (f += '}'),
    (f += '})()'),
    (f += '//# sourceURL=ndarray.ctor.set.js'),
    (f = eval(f)),
    (f.__isint__ = isInteger$8),
    (f.__get_index__ = getIndex$8),
    f
  );
}
const isInteger$9 = O$a.isPrimitive;
const getIndex$9 = i$Q;
function wrap$7(t) {
  return (
    (t = t[0]),
    function (r, e) {
      if (!isInteger$9(r))
        throw new TypeError(
          'invalid argument. Index must be an integer value. Value: `' + r + '`.'
        );
      return (
        (r = getIndex$9(r, this._shape[0] - 1, t)),
        (this._buffer[this._offset + this._strides[0] * r] = e),
        this
      );
    }
  );
}
const isInteger$a = O$a.isPrimitive;
const getIndex$a = i$Q;
function wrap$8(t) {
  const r = t[0 % t.length];
  const e = t[1 % t.length];
  return function (t, n, $) {
    let i;
    if (!isInteger$a(t))
      throw new TypeError(
        'invalid argument. Index for first dimension must be an integer value. Value: `' + t + '`.'
      );
    if (!isInteger$a(n))
      throw new TypeError(
        'invalid argument. Index for second dimension must be an integer value. Value: `' + n + '`.'
      );
    return (
      (t = getIndex$a(t, this._shape[0] - 1, r)),
      (n = getIndex$a(n, this._shape[1] - 1, e)),
      (i = this._offset + this._strides[0] * t + this._strides[1] * n),
      (this._buffer[i] = $),
      this
    );
  };
}
const isInteger$b = O$a.isPrimitive;
const getIndex$b = i$Q;
function wrap$9(t) {
  const r = t[0 % t.length];
  const e = t[1 % t.length];
  const n = t[2 % t.length];
  return function (t, $, i, o) {
    let a;
    if (!isInteger$b(t))
      throw new TypeError(
        'invalid argument. Index for first dimension must be an integer value. Value: `' + t + '`.'
      );
    if (!isInteger$b($))
      throw new TypeError(
        'invalid argument. Index for second dimension must be an integer value. Value: `' + $ + '`.'
      );
    if (!isInteger$b(i))
      throw new TypeError(
        'invalid argument. Index for third dimension must be an integer value. Value: `' + i + '`.'
      );
    return (
      (t = getIndex$b(t, this._shape[0] - 1, r)),
      ($ = getIndex$b($, this._shape[1] - 1, e)),
      (i = getIndex$b(i, this._shape[2] - 1, n)),
      (a = this._offset + this._strides[0] * t + this._strides[1] * $ + this._strides[2] * i),
      (this._buffer[a] = o),
      this
    );
  };
}
const isInteger$c = O$a.isPrimitive;
const getIndex$c = i$Q;
function wrap$a(t) {
  const r = t[0 % t.length];
  const e = t[1 % t.length];
  const n = t[2 % t.length];
  const $ = t[3 % t.length];
  return function (t, i, o, a, u) {
    let f;
    if (!isInteger$c(t))
      throw new TypeError(
        'invalid argument. Index for first dimension must be an integer value. Value: `' + t + '`.'
      );
    if (!isInteger$c(i))
      throw new TypeError(
        'invalid argument. Index for second dimension must be an integer value. Value: `' + i + '`.'
      );
    if (!isInteger$c(o))
      throw new TypeError(
        'invalid argument. Index for third dimension must be an integer value. Value: `' + o + '`.'
      );
    if (!isInteger$c(a))
      throw new TypeError(
        'invalid argument. Index for fourth dimension must be an integer value. Value: `' + a + '`.'
      );
    return (
      (t = getIndex$c(t, this._shape[0] - 1, r)),
      (i = getIndex$c(i, this._shape[1] - 1, e)),
      (o = getIndex$c(o, this._shape[2] - 1, n)),
      (a = getIndex$c(a, this._shape[3] - 1, $)),
      (f =
        this._offset +
        this._strides[0] * t +
        this._strides[1] * i +
        this._strides[2] * o +
        this._strides[3] * a),
      (this._buffer[f] = u),
      this
    );
  };
}
const isInteger$d = O$a.isPrimitive;
const getIndex$d = i$Q;
function wrap$b(t) {
  const r = t.length;
  return function () {
    let e;
    let n;
    let $;
    let i;
    for (e = arguments.length, n = this._offset, i = 0; i < e - 1; i++) {
      if (!isInteger$d(arguments[i]))
        throw new TypeError(
          'invalid argument. Indices must be integer valued. Argument: ' +
            i +
            '. Value: `' +
            arguments[i] +
            '`.'
        );
      ($ = getIndex$d(arguments[i], this._shape[i] - 1, t[i % r])), (n += this._strides[i] * $);
    }
    return (this._buffer[n] = arguments[i]), this;
  };
}
const compile$1 = set;
const set1d = wrap$7;
const set2d = wrap$8;
const set3d = wrap$9;
const set4d = wrap$a;
const setnd = wrap$b;
function set$1(t, r, e) {
  return r
    ? compile$1(t, e)
    : 1 === t
    ? set1d(e)
    : 2 === t
    ? set2d(e)
    : 3 === t
    ? set3d(e)
    : 4 === t
    ? set4d(e)
    : setnd(e);
}
function copy(t, r) {
  let e;
  let n;
  for (e = [], n = 0; n < r; n++) e.push(t[n]);
  return e;
}
const isObject = j$v;
const hasOwnProp = e$1e;
const isArray = e$1c;
const isBoolean = y$k.isPrimitive;
const isIndexMode = f$T;
function validate(t, r) {
  let e;
  if (!isObject(r))
    return new TypeError('invalid argument. Options must be an object. Value: `' + r + '`.');
  if (hasOwnProp(r, 'codegen') && ((t.codegen = r.codegen), !isBoolean(t.codegen)))
    return new TypeError(
      'invalid option. `codegen` option must be a boolean primitive. Option: `' + t.codegen + '`.'
    );
  if (hasOwnProp(r, 'mode') && ((t.mode = r.mode), !isIndexMode(t.mode)))
    return new TypeError(
      'invalid option. `mode` option must be a recognized mode. Option: `' + t.mode + '`.'
    );
  if (hasOwnProp(r, 'submode')) {
    if (((t.submode = r.submode), !isArray(t.submode)))
      return new TypeError(
        'invalid option. `submode` option must be an array containing recognized modes. Option: `' +
          t.submode +
          '`.'
      );
    if (0 === t.submode.length)
      return new TypeError(
        'invalid option. `submode` option must be an array containing recognized modes. Option: `' +
          t.submode.join(',') +
          '`.'
      );
    for (e = 0; e < t.submode.length; e++)
      if (!isIndexMode(t.submode[e]))
        return new TypeError(
          'invalid option. Each `submode` must be a recognized modes. Option: `' +
            t.submode[e] +
            '`.'
        );
    t.submode = t.submode.slice();
  }
  return null;
}
const setReadOnly = o$1b;
const isArrayLikeObject = o$Z;
const isTypedArrayLike = a$1M;
const isBuffer = f$15;
const isNonNegativeIntegerArray = s$T.primitives;
const isNonNegativeInteger = m$S.isPrimitive;
const isPositiveInteger = m$O.isPrimitive;
const isIntegerArray = m$N.primitives;
const isOrder = n$1a;
const isDataType = o$T;
const isBufferLengthCompatible = n$16;
const bytesPerElement = g$o;
const baseCtor = k$l;
const inherit = v$r;
const defaults = __var_14__;
const igetValue = wrap;
const isetValue = wrap$1;
const getValue = get$1;
const setValue = set$1;
const copy$1 = copy;
const validate$1 = validate;
const MAX_DIMS = 32767;
function ctor(t, r, e) {
  let n;
  let $;
  let i;
  if (!isDataType(t))
    throw new TypeError(
      'invalid argument. First argument must be a supported ndarray data type. Value: `' + t + '`.'
    );
  if (!isPositiveInteger(r))
    throw new TypeError(
      'invalid argument. Second argument must be a positive integer. Value: `' + r + '`.'
    );
  if (r > MAX_DIMS)
    throw new RangeError(
      'invalid argument. Number of dimensions must not exceed ' +
        MAX_DIMS +
        ' due to stack limits. Value: `' +
        r +
        '`.'
    );
  if (
    ((($ = {}).codegen = defaults.codegen),
    ($.mode = defaults.mode),
    arguments.length > 2 && (i = validate$1($, e)))
  )
    throw i;
  function o(t, e, $, i, a) {
    let u;
    let f;
    if (!(this instanceof o)) return new o(t, e, $, i, a);
    if (!isArrayLikeObject(t) && !isTypedArrayLike(t) && !isBuffer(t))
      throw new TypeError(
        'invalid argument. `buffer` argument must be an array-like object, typed-array-like, or a Buffer. Value: `' +
          t +
          '`.'
      );
    if (!isNonNegativeIntegerArray(e))
      throw new TypeError(
        'invalid argument. `shape` argument must be an array-like object containing nonnegative integers. Value: `' +
          e +
          '`.'
      );
    if (e.length !== r)
      throw new Error(
        'invalid argument. `shape` length must match the number of dimensions. Expected number of dimensions: ' +
          r +
          '. Shape length: ' +
          e.length +
          '.'
      );
    if (!isIntegerArray($))
      throw new TypeError(
        'invalid argument. `strides` argument must be an array-like object containing integers. Value: `' +
          $ +
          '`.'
      );
    if ($.length !== r)
      throw new Error(
        'invalid argument. `strides` length must match the number of dimensions. Expected number of dimensions: ' +
          r +
          '. Strides length: ' +
          $.length +
          '.'
      );
    if (!isNonNegativeInteger(i))
      throw new TypeError(
        'invalid argument. `offset` argument must be a nonnegative integer. Value: `' + i + '`.'
      );
    if (!isOrder(a))
      throw new TypeError(
        'invalid argument. `order` argument must be a supported order. Value: `' + a + '`.'
      );
    if (!isBufferLengthCompatible(t.length, e, $, i))
      throw new Error(
        'invalid arguments. The input buffer is incompatible with the specified meta data. Ensure that the offset is valid with regard to the stride array and that the buffer has enough elements to satisfy the desired array shape.'
      );
    return (
      (u = copy$1(e, r)),
      (f = copy$1($, r)),
      n.call(this, t, u, f, i, a),
      setReadOnly(this, '_parent', n),
      this
    );
  }
  return (
    void 0 === $.submode && ($.submode = [$.mode]),
    (n = baseCtor(t, r, $)),
    setReadOnly(o, 'BYTES_PER_ELEMENT', bytesPerElement(t)),
    setReadOnly(o, 'dtype', t),
    setReadOnly(o, 'ndims', r),
    inherit(o, n),
    setReadOnly(o.prototype, 'get', getValue(r, $.codegen, $.submode)),
    setReadOnly(o.prototype, 'iget', igetValue(n.prototype.iget, $.mode)),
    setReadOnly(o.prototype, 'set', setValue(r, $.codegen, $.submode)),
    setReadOnly(o.prototype, 'iset', isetValue(n.prototype.iset, $.mode)),
    o
  );
}
const ctor$1 = ctor;
const n$_ = !0;
const d$p = 'throw';
const t$C = { codegen: n$_, mode: d$p };
const m$I = ['codegen', 'mode', 'submode'];
const s$F = m$I;
const u$N = s$F.length;
const i$P = u$N - 1;
function a$1B(t, r) {
  let e;
  let n;
  for (e = t + ';', n = 0; n < u$N; n++)
    (e += s$F[n] + '=' + JSON.stringify(r[s$F[n]])), n < i$P && (e += ',');
  return e;
}
function c$x() {
  return {};
}
const f$S = j$v;
const g$k = e$1e;
const p$E = ctor$1;
const h$m = t$C;
const b$m = a$1B;
const l$z = c$x;
const v$q = l$z();
function j$r(t, r, e) {
  let n;
  let $;
  let i;
  let o;
  let a;
  let u;
  if ((($ = {}), arguments.length > 2)) {
    if (!f$S(e))
      throw new TypeError(
        'invalid argument. Options argument must be an object. Value: `' + e + '`.'
      );
    g$k(e, 'codegen') ? ($.codegen = e.codegen) : ($.codegen = h$m.codegen),
      g$k(e, 'mode') ? ($.mode = e.mode) : ($.mode = h$m.mode),
      g$k(e, 'submode') ? ($.submode = e.submode) : ($.submode = [$.mode]);
  } else ($.codegen = h$m.codegen), ($.mode = h$m.mode), ($.submode = [$.mode]);
  if (((i = b$m(t, $)), void 0 === (n = v$q[i]))) {
    for (a = p$E(t, r, $), n = [], u = 0; u < r - 1; u++) n.push(!1);
    return n.push(a), (v$q[i] = n), a;
  }
  if (r <= (o = n.length)) !1 === (a = n[r - 1]) && ((a = p$E(t, r, $)), (n[r - 1] = a));
  else {
    for (u = o + 1; u < r; u++) n.push(!1);
    (a = p$E(t, r, $)), n.push(a);
  }
  return a;
}
const w$h = j$r;
const e$Q = ['none', 'equiv', 'safe', 'same-kind', 'unsafe'];
const n$Z = e$Q;
function a$1A() {
  return n$Z.slice();
}
const r$q = a$1A;
const t$B = r$q;
const e$P = t$B();
const n$Y = e$P.length;
function o$K(t) {
  let r;
  for (r = 0; r < n$Y; r++) if (t === e$P[r]) return !0;
  return !1;
}
const a$1z = o$K;
function r$p(t) {
  return t != t;
}
const t$A = r$p;
const t$z = g$p.isPrimitive;
const n$X = t$A;
function o$J(t) {
  return t$z(t) && n$X(t);
}
const s$E = g$p.isObject;
const a$1y = t$A;
function m$H(t) {
  return s$E(t) && a$1y(t.valueOf());
}
const u$M = o$J;
const f$R = m$H;
function v$p(t) {
  return u$M(t) || f$R(t);
}
const p$D = o$1b;
const b$l = v$p;
const c$w = o$J;
const j$q = m$H;
p$D(b$l, 'isPrimitive', c$w), p$D(b$l, 'isObject', j$q);
const n$W = Object.prototype.propertyIsEnumerable;
const o$I = n$W;
function s$D() {
  return !o$I.call('beep', '0');
}
const a$1x = s$D();
const l$y = j$u;
const m$G = b$l.isPrimitive;
const p$C = O$a.isPrimitive;
const u$L = n$W;
const f$Q = a$1x;
function v$o(t, r) {
  let e;
  return (
    null != t &&
    (!(e = u$L.call(t, r)) && f$Q && l$y(t)
      ? !m$G((r = +r)) && p$C(r) && r >= 0 && r < t.length
      : e)
  );
}
const c$v = v$o;
const a$1w = 4294967295;
const s$C = y$n;
function m$F(t) {
  return '[object Arguments]' === s$C(t);
}
const l$x = m$F;
function p$B() {
  return l$x(arguments);
}
const u$K = p$B();
const f$P = e$1e;
const c$u = c$v;
const j$p = e$1c;
const h$l = a$1Z;
const g$j = a$1w;
function b$k(t) {
  return (
    null !== t &&
    'object' === typeof t &&
    !j$p(t) &&
    'number' === typeof t.length &&
    h$l(t.length) &&
    t.length >= 0 &&
    t.length <= g$j &&
    f$P(t, 'callee') &&
    !c$u(t, 'callee')
  );
}
const y$e = u$K;
const x$j = m$F;
const d$o = b$k;
const w$g = y$e ? x$j : d$o;
function t$y() {}
const a$1v = t$y;
const r$o = a$1Z;
const n$V = a$1N;
function a$1u(t) {
  return (
    'object' === typeof t &&
    null !== t &&
    'number' === typeof t.length &&
    r$o(t.length) &&
    t.length >= 0 &&
    t.length <= n$V
  );
}
const o$H = a$1u;
const n$U = b$l;
const s$B = o$H;
const a$1t = j$u.isPrimitive;
const o$G = O$a.isPrimitive;
function f$O(t, r, e) {
  let n;
  let $;
  if (!s$B(t) && !a$1t(t))
    throw new TypeError(
      'invalid argument. First argument must be an array-like object. Value: `' + t + '`.'
    );
  if (0 === (n = t.length)) return -1;
  if (3 === arguments.length) {
    if (!o$G(e))
      throw new TypeError('invalid argument. `fromIndex` must be an integer. Value: `' + e + '`.');
    if (e >= 0) {
      if (e >= n) return -1;
      $ = e;
    } else ($ = n + e) < 0 && ($ = 0);
  } else $ = 0;
  if (n$U(r)) {
    for (; $ < n; $++) if (n$U(t[$])) return $;
  } else for (; $ < n; $++) if (t[$] === r) return $;
  return -1;
}
const m$E = f$O;
function s$A(t) {
  return Object.keys(Object(t));
}
const u$J = s$A;
function p$A() {
  return 2 !== (u$J(arguments) || '').length;
}
function c$t() {
  return p$A(1, 2);
}
const a$1s = void 0 !== Object.keys;
const l$w = w$g;
const m$D = s$A;
const g$i = Array.prototype.slice;
function y$d(t) {
  return l$w(t) ? m$D(g$i.call(t)) : m$D(t);
}
const d$n = c$v;
const h$k = a$1v;
const j$o = d$n(h$k, 'prototype');
const v$n = c$v;
const w$f = { toString: null };
const b$j = !v$n(w$f, 'toString');
function S$7(t) {
  return t.constructor && t.constructor.prototype === t;
}
const k$k = [
  'console',
  'external',
  'frame',
  'frameElement',
  'frames',
  'innerHeight',
  'innerWidth',
  'outerHeight',
  'outerWidth',
  'pageXOffset',
  'pageYOffset',
  'parent',
  'scrollLeft',
  'scrollTop',
  'scrollX',
  'scrollY',
  'self',
  'webkitIndexedDB',
  'webkitStorageInfo',
  'window',
];
const x$i = 'undefined' === typeof window ? void 0 : window;
const I$a = e$1e;
const E$a = m$E;
const H$b = b$r;
const L$9 = S$7;
const P$8 = k$k;
const W$7 = x$i;
function X$7() {
  let t;
  if ('undefined' === H$b(W$7)) return !1;
  for (t in W$7)
    try {
      -1 === E$a(P$8, t) &&
        I$a(W$7, t) &&
        null !== W$7[t] &&
        'object' === H$b(W$7[t]) &&
        L$9(W$7[t]);
    } catch (t) {
      return !0;
    }
  return !1;
}
const Y$7 = X$7();
const A$d = 'undefined' !== typeof window;
const B$c = Y$7;
const D$b = S$7;
const T$7 = A$d;
function q$e(t) {
  if (!1 === T$7 && !B$c) return D$b(t);
  try {
    return D$b(t);
  } catch (t) {
    return !1;
  }
}
const z$a = [
  'toString',
  'toLocaleString',
  'valueOf',
  'hasOwnProperty',
  'isPrototypeOf',
  'propertyIsEnumerable',
  'constructor',
];
const C$c = i$11;
const F$c = e$1e;
const G$a = w$g;
const J$9 = j$o;
const K$8 = b$j;
const M$8 = q$e;
const N$e = z$a;
function Q$7(t) {
  let r;
  let e;
  let n;
  let $;
  let i;
  let o;
  let a;
  if ((($ = []), G$a(t))) {
    for (a = 0; a < t.length; a++) $.push(a.toString());
    return $;
  }
  if ('string' === typeof t) {
    if (t.length > 0 && !F$c(t, '0')) for (a = 0; a < t.length; a++) $.push(a.toString());
  } else {
    if (!1 == (n = 'function' === typeof t) && !C$c(t)) return $;
    e = J$9 && n;
  }
  for (i in t) (e && 'prototype' === i) || !F$c(t, i) || $.push(String(i));
  if (K$8)
    for (r = M$8(t), a = 0; a < N$e.length; a++)
      (o = N$e[a]), (r && 'constructor' === o) || !F$c(t, o) || $.push(String(o));
  return $;
}
const U$9 = c$t;
const V$7 = a$1s;
const Z$7 = s$A;
const $$7 = y$d;
const _$8 = Q$7;
const rr$6 = V$7 ? (U$9() ? $$7 : Z$7) : _$8;
const tr$4 = rr$6;
let i$O;
const u$I = {
  float64: 1,
  float32: 0,
  int32: 0,
  int16: 0,
  int8: 0,
  uint32: 0,
  uint16: 0,
  uint8: 0,
  uint8c: 0,
  binary: 0,
  generic: 1,
};
const r$n = {
  float64: 1,
  float32: 1,
  int32: 0,
  int16: 0,
  int8: 0,
  uint32: 0,
  uint16: 0,
  uint8: 0,
  uint8c: 0,
  binary: 0,
  generic: 1,
};
const a$1r = {
  float64: 1,
  float32: 0,
  int32: 1,
  int16: 0,
  int8: 0,
  uint32: 0,
  uint16: 0,
  uint8: 0,
  uint8c: 0,
  binary: 0,
  generic: 1,
};
const o$F = {
  float64: 1,
  float32: 1,
  int32: 1,
  int16: 1,
  int8: 0,
  uint32: 0,
  uint16: 0,
  uint8: 0,
  uint8c: 0,
  binary: 0,
  generic: 1,
};
const e$O = {
  float64: 1,
  float32: 1,
  int32: 1,
  int16: 1,
  int8: 1,
  uint32: 0,
  uint16: 0,
  uint8: 0,
  uint8c: 0,
  binary: 0,
  generic: 1,
};
const f$N = {
  float64: 1,
  float32: 0,
  int32: 0,
  int16: 0,
  int8: 0,
  uint32: 1,
  uint16: 0,
  uint8: 0,
  uint8c: 0,
  binary: 0,
  generic: 1,
};
const l$v = {
  float64: 1,
  float32: 1,
  int32: 1,
  int16: 0,
  int8: 0,
  uint32: 1,
  uint16: 1,
  uint8: 0,
  uint8c: 0,
  binary: 0,
  generic: 1,
};
const c$s = {
  float64: 1,
  float32: 1,
  int32: 1,
  int16: 1,
  int8: 0,
  uint32: 1,
  uint16: 1,
  uint8: 1,
  uint8c: 1,
  binary: 1,
  generic: 1,
};
const g$h = {
  float64: 1,
  float32: 1,
  int32: 1,
  int16: 1,
  int8: 0,
  uint32: 1,
  uint16: 1,
  uint8: 1,
  uint8c: 1,
  binary: 1,
  generic: 1,
};
const y$c = {
  float64: 0,
  float32: 0,
  int32: 0,
  int16: 0,
  int8: 0,
  uint32: 0,
  uint16: 0,
  uint8: 0,
  uint8c: 0,
  binary: 0,
  generic: 1,
};
const b$i = {
  float64: 0,
  float32: 0,
  int32: 0,
  int16: 0,
  int8: 0,
  uint32: 0,
  uint16: 0,
  uint8: 0,
  uint8c: 0,
  binary: 1,
  generic: 0,
};
const s$z = {
  float64: u$I,
  float32: r$n,
  int32: a$1r,
  int16: o$F,
  int8: e$O,
  uint32: f$N,
  uint16: l$v,
  uint8: c$s,
  uint8c: g$h,
  generic: y$c,
  binary: b$i,
};
const p$z = tr$4;
const h$j = e$1e;
const v$m = s$z;
function m$C() {
  let t;
  let r;
  let e;
  let n;
  let $;
  let i;
  let o;
  let a;
  let u;
  for (e = {}, r = (t = p$z(v$m)).length, u = 0; u < r; u++) {
    for ($ = t[u], o = v$m[$], n = {}, a = 0; a < r; a++) n[(i = t[a])] = o[i];
    e[$] = n;
  }
  return e;
}
function d$m() {
  let t;
  let r;
  let e;
  let n;
  let $;
  let i;
  let o;
  let a;
  let u;
  for (e = {}, r = (t = p$z(v$m)).length, u = 0; u < r; u++) {
    for ($ = t[u], o = v$m[$], n = [], a = 0; a < r; a++) 1 === o[(i = t[a])] && n.push(i);
    e[$] = n;
  }
  return e;
}
function j$n(t) {
  return 0 === arguments.length
    ? m$C()
    : (void 0 === i$O && (i$O = d$m()), h$j(i$O, t) ? i$O[t].slice() : null);
}
const k$j = j$n;
const t$x = k$j;
const a$1q = t$x();
function e$N(t, r) {
  return t === r || a$1q[t][r] > 0;
}
const f$M = e$N;
let i$N;
const u$H = {
  float64: 1,
  float32: 1,
  int32: 0,
  int16: 0,
  int8: 0,
  uint32: 0,
  uint16: 0,
  uint8: 0,
  uint8c: 0,
  binary: 0,
  generic: 1,
};
const r$m = {
  float64: 1,
  float32: 1,
  int32: 0,
  int16: 0,
  int8: 0,
  uint32: 0,
  uint16: 0,
  uint8: 0,
  uint8c: 0,
  binary: 0,
  generic: 1,
};
const a$1p = {
  float64: 1,
  float32: 0,
  int32: 1,
  int16: 1,
  int8: 1,
  uint32: 0,
  uint16: 0,
  uint8: 0,
  uint8c: 0,
  binary: 0,
  generic: 1,
};
const o$E = {
  float64: 1,
  float32: 1,
  int32: 1,
  int16: 1,
  int8: 1,
  uint32: 0,
  uint16: 0,
  uint8: 0,
  uint8c: 0,
  binary: 0,
  generic: 1,
};
const e$M = {
  float64: 1,
  float32: 1,
  int32: 1,
  int16: 1,
  int8: 1,
  uint32: 0,
  uint16: 0,
  uint8: 0,
  uint8c: 0,
  binary: 0,
  generic: 1,
};
const f$L = {
  float64: 1,
  float32: 0,
  int32: 0,
  int16: 0,
  int8: 0,
  uint32: 1,
  uint16: 1,
  uint8: 1,
  uint8c: 1,
  binary: 0,
  generic: 1,
};
const l$u = {
  float64: 1,
  float32: 1,
  int32: 1,
  int16: 0,
  int8: 0,
  uint32: 1,
  uint16: 1,
  uint8: 1,
  uint8c: 1,
  binary: 0,
  generic: 1,
};
const c$r = {
  float64: 1,
  float32: 1,
  int32: 1,
  int16: 1,
  int8: 0,
  uint32: 1,
  uint16: 1,
  uint8: 1,
  uint8c: 1,
  binary: 1,
  generic: 1,
};
const g$g = {
  float64: 1,
  float32: 1,
  int32: 1,
  int16: 1,
  int8: 0,
  uint32: 1,
  uint16: 1,
  uint8: 1,
  uint8c: 1,
  binary: 1,
  generic: 1,
};
const y$b = {
  float64: 0,
  float32: 0,
  int32: 0,
  int16: 0,
  int8: 0,
  uint32: 0,
  uint16: 0,
  uint8: 0,
  uint8c: 0,
  binary: 0,
  generic: 1,
};
const b$h = {
  float64: 0,
  float32: 0,
  int32: 0,
  int16: 0,
  int8: 0,
  uint32: 0,
  uint16: 0,
  uint8: 0,
  uint8c: 0,
  binary: 1,
  generic: 0,
};
const s$y = {
  float64: u$H,
  float32: r$m,
  int32: a$1p,
  int16: o$E,
  int8: e$M,
  uint32: f$L,
  uint16: l$u,
  uint8: c$r,
  uint8c: g$g,
  generic: y$b,
  binary: b$h,
};
const p$y = tr$4;
const h$i = e$1e;
const v$l = s$y;
function m$B() {
  let t;
  let r;
  let e;
  let n;
  let $;
  let i;
  let o;
  let a;
  let u;
  for (e = {}, r = (t = p$y(v$l)).length, u = 0; u < r; u++) {
    for ($ = t[u], o = v$l[$], n = {}, a = 0; a < r; a++) n[(i = t[a])] = o[i];
    e[$] = n;
  }
  return e;
}
function d$l() {
  let t;
  let r;
  let e;
  let n;
  let $;
  let i;
  let o;
  let a;
  let u;
  for (e = {}, r = (t = p$y(v$l)).length, u = 0; u < r; u++) {
    for ($ = t[u], o = v$l[$], n = [], a = 0; a < r; a++) 1 === o[(i = t[a])] && n.push(i);
    e[$] = n;
  }
  return e;
}
function j$m(t) {
  return 0 === arguments.length
    ? m$B()
    : (void 0 === i$N && (i$N = d$l()), h$i(i$N, t) ? i$N[t].slice() : null);
}
const k$i = j$m;
const t$w = k$i;
const a$1o = t$w();
function e$L(t, r) {
  return t === r || a$1o[t][r] > 0;
}
const n$T = e$L;
const e$K = f$M;
const s$x = n$T;
function r$l(t, r, e) {
  return (
    'unsafe' === e ||
    t === r ||
    ('none' !== e && 'equiv' !== e && ('safe' === e ? e$K(t, r) : s$x(t, r)))
  );
}
const f$K = r$l;
const r$k = 'function' === typeof Buffer ? Buffer : null;
const t$v = f$15;
const n$S = r$k;
function o$D() {
  let t;
  let r;
  if ('function' !== typeof n$S) return !1;
  try {
    (r = 'function' === typeof n$S.from ? n$S.from([1, 2, 3, 4]) : new n$S([1, 2, 3, 4])),
      (t = t$v(r) && 1 === r[0] && 2 === r[1] && 3 === r[2] && 4 === r[3]);
  } catch (r) {
    t = !1;
  }
  return t;
}
const e$J = o$D;
function createCommonjsModule(t, r, e) {
  return (
    t(
      (e = {
        path: r,
        exports: {},
        require: function (t, r) {
          return commonjsRequire(t, null == r ? e.path : r);
        },
      }),
      e.exports
    ),
    e.exports
  );
}
function commonjsRequire() {
  throw new Error('Dynamic requires are not currently supported by @rollup/plugin-commonjs');
}
for (
  var byteLength_1 = byteLength,
    toByteArray_1 = toByteArray,
    fromByteArray_1 = fromByteArray,
    lookup = [],
    revLookup = [],
    Arr = 'undefined' !== typeof Uint8Array ? Uint8Array : Array,
    code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
    i$M = 0,
    len = code.length;
  i$M < len;
  ++i$M
)
  (lookup[i$M] = code[i$M]), (revLookup[code.charCodeAt(i$M)] = i$M);
function getLens(t) {
  const r = t.length;
  if (r % 4 > 0) throw new Error('Invalid string. Length must be a multiple of 4');
  let e = t.indexOf('=');
  return -1 === e && (e = r), [e, e === r ? 0 : 4 - (e % 4)];
}
function byteLength(t) {
  const r = getLens(t);
  const e = r[0];
  const n = r[1];
  return (3 * (e + n)) / 4 - n;
}
function _byteLength(t, r, e) {
  return (3 * (r + e)) / 4 - e;
}
function toByteArray(t) {
  let r;
  let e;
  const n = getLens(t);
  const $ = n[0];
  const i = n[1];
  const o = new Arr(_byteLength(t, $, i));
  let a = 0;
  const u = i > 0 ? $ - 4 : $;
  for (e = 0; e < u; e += 4)
    (r =
      (revLookup[t.charCodeAt(e)] << 18) |
      (revLookup[t.charCodeAt(e + 1)] << 12) |
      (revLookup[t.charCodeAt(e + 2)] << 6) |
      revLookup[t.charCodeAt(e + 3)]),
      (o[a++] = (r >> 16) & 255),
      (o[a++] = (r >> 8) & 255),
      (o[a++] = 255 & r);
  return (
    2 === i &&
      ((r = (revLookup[t.charCodeAt(e)] << 2) | (revLookup[t.charCodeAt(e + 1)] >> 4)),
      (o[a++] = 255 & r)),
    1 === i &&
      ((r =
        (revLookup[t.charCodeAt(e)] << 10) |
        (revLookup[t.charCodeAt(e + 1)] << 4) |
        (revLookup[t.charCodeAt(e + 2)] >> 2)),
      (o[a++] = (r >> 8) & 255),
      (o[a++] = 255 & r)),
    o
  );
}
function tripletToBase64(t) {
  return lookup[(t >> 18) & 63] + lookup[(t >> 12) & 63] + lookup[(t >> 6) & 63] + lookup[63 & t];
}
function encodeChunk(t, r, e) {
  for (var n, $ = [], i = r; i < e; i += 3)
    (n = ((t[i] << 16) & 16711680) + ((t[i + 1] << 8) & 65280) + (255 & t[i + 2])),
      $.push(tripletToBase64(n));
  return $.join('');
}
function fromByteArray(t) {
  for (var r, e = t.length, n = e % 3, $ = [], i = 16383, o = 0, a = e - n; o < a; o += i)
    $.push(encodeChunk(t, o, o + i > a ? a : o + i));
  return (
    1 === n
      ? ((r = t[e - 1]), $.push(lookup[r >> 2] + lookup[(r << 4) & 63] + '=='))
      : 2 === n &&
        ((r = (t[e - 2] << 8) + t[e - 1]),
        $.push(lookup[r >> 10] + lookup[(r >> 4) & 63] + lookup[(r << 2) & 63] + '=')),
    $.join('')
  );
}
(revLookup['-'.charCodeAt(0)] = 62), (revLookup['_'.charCodeAt(0)] = 63);
const base64Js = {
  byteLength: byteLength_1,
  toByteArray: toByteArray_1,
  fromByteArray: fromByteArray_1,
};
const read = function (t, r, e, n, $) {
  let i;
  let o;
  const a = 8 * $ - n - 1;
  const u = (1 << a) - 1;
  const f = u >> 1;
  let s = -7;
  let c = e ? $ - 1 : 0;
  const l = e ? -1 : 1;
  let p = t[r + c];
  for (
    c += l, i = p & ((1 << -s) - 1), p >>= -s, s += a;
    s > 0;
    i = 256 * i + t[r + c], c += l, s -= 8
  );
  for (o = i & ((1 << -s) - 1), i >>= -s, s += n; s > 0; o = 256 * o + t[r + c], c += l, s -= 8);
  if (0 === i) i = 1 - f;
  else {
    if (i === u) return o ? NaN : (1 / 0) * (p ? -1 : 1);
    (o += Math.pow(2, n)), (i -= f);
  }
  return (p ? -1 : 1) * o * Math.pow(2, i - n);
};
const write = function (t, r, e, n, $, i) {
  let o;
  let a;
  let u;
  let f = 8 * i - $ - 1;
  const s = (1 << f) - 1;
  const c = s >> 1;
  const l = 23 === $ ? Math.pow(2, -24) - Math.pow(2, -77) : 0;
  let p = n ? 0 : i - 1;
  const h = n ? 1 : -1;
  const g = r < 0 || (0 === r && 1 / r < 0) ? 1 : 0;
  for (
    r = Math.abs(r),
      isNaN(r) || r === 1 / 0
        ? ((a = isNaN(r) ? 1 : 0), (o = s))
        : ((o = Math.floor(Math.log(r) / Math.LN2)),
          r * (u = Math.pow(2, -o)) < 1 && (o--, (u *= 2)),
          (r += o + c >= 1 ? l / u : l * Math.pow(2, 1 - c)) * u >= 2 && (o++, (u /= 2)),
          o + c >= s
            ? ((a = 0), (o = s))
            : o + c >= 1
            ? ((a = (r * u - 1) * Math.pow(2, $)), (o += c))
            : ((a = r * Math.pow(2, c - 1) * Math.pow(2, $)), (o = 0)));
    $ >= 8;
    t[e + p] = 255 & a, p += h, a /= 256, $ -= 8
  );
  for (o = (o << $) | a, f += $; f > 0; t[e + p] = 255 & o, p += h, o /= 256, f -= 8);
  t[e + p - h] |= 128 * g;
};
const ieee754 = { read: read, write: write };
const buffer = createCommonjsModule(function (t, r) {
  const e =
    'function' === typeof Symbol && 'function' === typeof Symbol.for
      ? Symbol.for('nodejs.util.inspect.custom')
      : null;
  (r.Buffer = i),
    (r.SlowBuffer = function (t) {
      return +t != t && (t = 0), i.alloc(+t);
    }),
    (r.INSPECT_MAX_BYTES = 50);
  const n = 2147483647;
  function $(t) {
    if (t > n) throw new RangeError('The value "' + t + '" is invalid for option "size"');
    const r = new Uint8Array(t);
    return Object.setPrototypeOf(r, i.prototype), r;
  }
  function i(t, r, e) {
    if ('number' === typeof t) {
      if ('string' === typeof r)
        throw new TypeError('The "string" argument must be of type string. Received type number');
      return u(t);
    }
    return o(t, r, e);
  }
  function o(t, r, e) {
    if ('string' === typeof t)
      return (function (t, r) {
        if ((('string' === typeof r && '' !== r) || (r = 'utf8'), !i.isEncoding(r)))
          throw new TypeError('Unknown encoding: ' + r);
        const e = 0 | l(t, r);
        let n = $(e);
        const o = n.write(t, r);
        return o !== e && (n = n.slice(0, o)), n;
      })(t, r);
    if (ArrayBuffer.isView(t))
      return (function (t) {
        if (G(t, Uint8Array)) {
          const r = new Uint8Array(t);
          return s(r.buffer, r.byteOffset, r.byteLength);
        }
        return f(t);
      })(t);
    if (null == t)
      throw new TypeError(
        'The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type ' +
          typeof t
      );
    if (G(t, ArrayBuffer) || (t && G(t.buffer, ArrayBuffer))) return s(t, r, e);
    if (
      'undefined' !== typeof SharedArrayBuffer &&
      (G(t, SharedArrayBuffer) || (t && G(t.buffer, SharedArrayBuffer)))
    )
      return s(t, r, e);
    if ('number' === typeof t)
      throw new TypeError('The "value" argument must not be of type number. Received type number');
    const n = t.valueOf && t.valueOf();
    if (null != n && n !== t) return i.from(n, r, e);
    const o = (function (t) {
      if (i.isBuffer(t)) {
        const r = 0 | c(t.length);
        const e = $(r);
        return 0 === e.length || t.copy(e, 0, 0, r), e;
      }
      return void 0 !== t.length
        ? 'number' !== typeof t.length || J(t.length)
          ? $(0)
          : f(t)
        : 'Buffer' === t.type && Array.isArray(t.data)
        ? f(t.data)
        : void 0;
    })(t);
    if (o) return o;
    if (
      'undefined' !== typeof Symbol &&
      null != Symbol.toPrimitive &&
      'function' === typeof t[Symbol.toPrimitive]
    )
      return i.from(t[Symbol.toPrimitive]('string'), r, e);
    throw new TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type ' +
        typeof t
    );
  }
  function a(t) {
    if ('number' !== typeof t) throw new TypeError('"size" argument must be of type number');
    if (t < 0) throw new RangeError('The value "' + t + '" is invalid for option "size"');
  }
  function u(t) {
    return a(t), $(t < 0 ? 0 : 0 | c(t));
  }
  function f(t) {
    const r = t.length < 0 ? 0 : 0 | c(t.length);
    const e = $(r);
    for (let n = 0; n < r; n += 1) e[n] = 255 & t[n];
    return e;
  }
  function s(t, r, e) {
    if (r < 0 || t.byteLength < r) throw new RangeError('"offset" is outside of buffer bounds');
    if (t.byteLength < r + (e || 0)) throw new RangeError('"length" is outside of buffer bounds');
    let n;
    return (
      (n =
        void 0 === r && void 0 === e
          ? new Uint8Array(t)
          : void 0 === e
          ? new Uint8Array(t, r)
          : new Uint8Array(t, r, e)),
      Object.setPrototypeOf(n, i.prototype),
      n
    );
  }
  function c(t) {
    if (t >= n)
      throw new RangeError(
        'Attempt to allocate Buffer larger than maximum size: 0x' + n.toString(16) + ' bytes'
      );
    return 0 | t;
  }
  function l(t, r) {
    if (i.isBuffer(t)) return t.length;
    if (ArrayBuffer.isView(t) || G(t, ArrayBuffer)) return t.byteLength;
    if ('string' !== typeof t)
      throw new TypeError(
        'The "string" argument must be one of type string, Buffer, or ArrayBuffer. Received type ' +
          typeof t
      );
    const e = t.length;
    const n = arguments.length > 2 && !0 === arguments[2];
    if (!n && 0 === e) return 0;
    let $ = !1;
    for (;;)
      switch (r) {
        case 'ascii':
        case 'latin1':
        case 'binary':
          return e;
        case 'utf8':
        case 'utf-8':
          return z(t).length;
        case 'ucs2':
        case 'ucs-2':
        case 'utf16le':
        case 'utf-16le':
          return 2 * e;
        case 'hex':
          return e >>> 1;
        case 'base64':
          return D(t).length;
        default:
          if ($) return n ? -1 : z(t).length;
          (r = ('' + r).toLowerCase()), ($ = !0);
      }
  }
  function p(t, r, e) {
    let n = !1;
    if (((void 0 === r || r < 0) && (r = 0), r > this.length)) return '';
    if (((void 0 === e || e > this.length) && (e = this.length), e <= 0)) return '';
    if ((e >>>= 0) <= (r >>>= 0)) return '';
    for (t || (t = 'utf8'); ; )
      switch (t) {
        case 'hex':
          return O(this, r, e);
        case 'utf8':
        case 'utf-8':
          return _(this, r, e);
        case 'ascii':
          return A(this, r, e);
        case 'latin1':
        case 'binary':
          return j(this, r, e);
        case 'base64':
          return E(this, r, e);
        case 'ucs2':
        case 'ucs-2':
        case 'utf16le':
        case 'utf-16le':
          return x(this, r, e);
        default:
          if (n) throw new TypeError('Unknown encoding: ' + t);
          (t = (t + '').toLowerCase()), (n = !0);
      }
  }
  function h(t, r, e) {
    const n = t[r];
    (t[r] = t[e]), (t[e] = n);
  }
  function g(t, r, e, n, $) {
    if (0 === t.length) return -1;
    if (
      ('string' === typeof e
        ? ((n = e), (e = 0))
        : e > 2147483647
        ? (e = 2147483647)
        : e < -2147483648 && (e = -2147483648),
      J((e = +e)) && (e = $ ? 0 : t.length - 1),
      e < 0 && (e = t.length + e),
      e >= t.length)
    ) {
      if ($) return -1;
      e = t.length - 1;
    } else if (e < 0) {
      if (!$) return -1;
      e = 0;
    }
    if (('string' === typeof r && (r = i.from(r, n)), i.isBuffer(r)))
      return 0 === r.length ? -1 : d(t, r, e, n, $);
    if ('number' === typeof r)
      return (
        (r &= 255),
        'function' === typeof Uint8Array.prototype.indexOf
          ? $
            ? Uint8Array.prototype.indexOf.call(t, r, e)
            : Uint8Array.prototype.lastIndexOf.call(t, r, e)
          : d(t, [r], e, n, $)
      );
    throw new TypeError('val must be string, number or Buffer');
  }
  function d(t, r, e, n, $) {
    let i;
    let o = 1;
    let a = t.length;
    let u = r.length;
    if (
      void 0 !== n &&
      ('ucs2' === (n = String(n).toLowerCase()) ||
        'ucs-2' === n ||
        'utf16le' === n ||
        'utf-16le' === n)
    ) {
      if (t.length < 2 || r.length < 2) return -1;
      (o = 2), (a /= 2), (u /= 2), (e /= 2);
    }
    function f(t, r) {
      return 1 === o ? t[r] : t.readUInt16BE(r * o);
    }
    if ($) {
      let n = -1;
      for (i = e; i < a; i++)
        if (f(t, i) === f(r, -1 === n ? 0 : i - n)) {
          if ((-1 === n && (n = i), i - n + 1 === u)) return n * o;
        } else -1 !== n && (i -= i - n), (n = -1);
    } else
      for (e + u > a && (e = a - u), i = e; i >= 0; i--) {
        let e = !0;
        for (let n = 0; n < u; n++)
          if (f(t, i + n) !== f(r, n)) {
            e = !1;
            break;
          }
        if (e) return i;
      }
    return -1;
  }
  function v(t, r, e, n) {
    e = Number(e) || 0;
    const $ = t.length - e;
    n ? (n = Number(n)) > $ && (n = $) : (n = $);
    const i = r.length;
    let o;
    for (n > i / 2 && (n = i / 2), o = 0; o < n; ++o) {
      const n = parseInt(r.substr(2 * o, 2), 16);
      if (J(n)) return o;
      t[e + o] = n;
    }
    return o;
  }
  function y(t, r, e, n) {
    return H(z(r, t.length - e), t, e, n);
  }
  function m(t, r, e, n) {
    return H(
      (function (t) {
        const r = [];
        for (let e = 0; e < t.length; ++e) r.push(255 & t.charCodeAt(e));
        return r;
      })(r),
      t,
      e,
      n
    );
  }
  function b(t, r, e, n) {
    return H(D(r), t, e, n);
  }
  function w(t, r, e, n) {
    return H(
      (function (t, r) {
        let e;
        let n;
        let $;
        const i = [];
        for (let o = 0; o < t.length && !((r -= 2) < 0); ++o)
          (e = t.charCodeAt(o)), (n = e >> 8), ($ = e % 256), i.push($), i.push(n);
        return i;
      })(r, t.length - e),
      t,
      e,
      n
    );
  }
  function E(t, r, e) {
    return 0 === r && e === t.length
      ? base64Js.fromByteArray(t)
      : base64Js.fromByteArray(t.slice(r, e));
  }
  function _(t, r, e) {
    e = Math.min(t.length, e);
    const n = [];
    let $ = r;
    for (; $ < e; ) {
      const r = t[$];
      let i = null;
      let o = r > 239 ? 4 : r > 223 ? 3 : r > 191 ? 2 : 1;
      if ($ + o <= e) {
        let e;
        let n;
        let a;
        let u;
        switch (o) {
          case 1:
            r < 128 && (i = r);
            break;
          case 2:
            (e = t[$ + 1]),
              128 == (192 & e) && ((u = ((31 & r) << 6) | (63 & e)), u > 127 && (i = u));
            break;
          case 3:
            (e = t[$ + 1]),
              (n = t[$ + 2]),
              128 == (192 & e) &&
                128 == (192 & n) &&
                ((u = ((15 & r) << 12) | ((63 & e) << 6) | (63 & n)),
                u > 2047 && (u < 55296 || u > 57343) && (i = u));
            break;
          case 4:
            (e = t[$ + 1]),
              (n = t[$ + 2]),
              (a = t[$ + 3]),
              128 == (192 & e) &&
                128 == (192 & n) &&
                128 == (192 & a) &&
                ((u = ((15 & r) << 18) | ((63 & e) << 12) | ((63 & n) << 6) | (63 & a)),
                u > 65535 && u < 1114112 && (i = u));
        }
      }
      null === i
        ? ((i = 65533), (o = 1))
        : i > 65535 &&
          ((i -= 65536), n.push(((i >>> 10) & 1023) | 55296), (i = 56320 | (1023 & i))),
        n.push(i),
        ($ += o);
    }
    return (function (t) {
      const r = t.length;
      if (r <= I) return String.fromCharCode.apply(String, t);
      let e = '';
      let n = 0;
      for (; n < r; ) e += String.fromCharCode.apply(String, t.slice(n, (n += I)));
      return e;
    })(n);
  }
  (r.kMaxLength = n),
    (i.TYPED_ARRAY_SUPPORT = (function () {
      try {
        const t = new Uint8Array(1);
        const r = {
          foo: function () {
            return 42;
          },
        };
        return (
          Object.setPrototypeOf(r, Uint8Array.prototype),
          Object.setPrototypeOf(t, r),
          42 === t.foo()
        );
      } catch (t) {
        return !1;
      }
    })()),
    i.TYPED_ARRAY_SUPPORT ||
      'undefined' === typeof console ||
      'function' !== typeof console.error ||
      console.error(
        'This browser lacks typed array (Uint8Array) support which is required by `buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
      ),
    Object.defineProperty(i.prototype, 'parent', {
      enumerable: !0,
      get: function () {
        if (i.isBuffer(this)) return this.buffer;
      },
    }),
    Object.defineProperty(i.prototype, 'offset', {
      enumerable: !0,
      get: function () {
        if (i.isBuffer(this)) return this.byteOffset;
      },
    }),
    (i.poolSize = 8192),
    (i.from = function (t, r, e) {
      return o(t, r, e);
    }),
    Object.setPrototypeOf(i.prototype, Uint8Array.prototype),
    Object.setPrototypeOf(i, Uint8Array),
    (i.alloc = function (t, r, e) {
      return (function (t, r, e) {
        return (
          a(t),
          t <= 0
            ? $(t)
            : void 0 !== r
            ? 'string' === typeof e
              ? $(t).fill(r, e)
              : $(t).fill(r)
            : $(t)
        );
      })(t, r, e);
    }),
    (i.allocUnsafe = function (t) {
      return u(t);
    }),
    (i.allocUnsafeSlow = function (t) {
      return u(t);
    }),
    (i.isBuffer = function (t) {
      return null != t && !0 === t._isBuffer && t !== i.prototype;
    }),
    (i.compare = function (t, r) {
      if (
        (G(t, Uint8Array) && (t = i.from(t, t.offset, t.byteLength)),
        G(r, Uint8Array) && (r = i.from(r, r.offset, r.byteLength)),
        !i.isBuffer(t) || !i.isBuffer(r))
      )
        throw new TypeError(
          'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
        );
      if (t === r) return 0;
      let e = t.length;
      let n = r.length;
      for (let $ = 0, i = Math.min(e, n); $ < i; ++$)
        if (t[$] !== r[$]) {
          (e = t[$]), (n = r[$]);
          break;
        }
      return e < n ? -1 : n < e ? 1 : 0;
    }),
    (i.isEncoding = function (t) {
      switch (String(t).toLowerCase()) {
        case 'hex':
        case 'utf8':
        case 'utf-8':
        case 'ascii':
        case 'latin1':
        case 'binary':
        case 'base64':
        case 'ucs2':
        case 'ucs-2':
        case 'utf16le':
        case 'utf-16le':
          return !0;
        default:
          return !1;
      }
    }),
    (i.concat = function (t, r) {
      if (!Array.isArray(t)) throw new TypeError('"list" argument must be an Array of Buffers');
      if (0 === t.length) return i.alloc(0);
      let e;
      if (void 0 === r) for (r = 0, e = 0; e < t.length; ++e) r += t[e].length;
      const n = i.allocUnsafe(r);
      let $ = 0;
      for (e = 0; e < t.length; ++e) {
        let r = t[e];
        if (G(r, Uint8Array))
          $ + r.length > n.length
            ? (i.isBuffer(r) || (r = i.from(r)), r.copy(n, $))
            : Uint8Array.prototype.set.call(n, r, $);
        else {
          if (!i.isBuffer(r)) throw new TypeError('"list" argument must be an Array of Buffers');
          r.copy(n, $);
        }
        $ += r.length;
      }
      return n;
    }),
    (i.byteLength = l),
    (i.prototype._isBuffer = !0),
    (i.prototype.swap16 = function () {
      const t = this.length;
      if (t % 2 != 0) throw new RangeError('Buffer size must be a multiple of 16-bits');
      for (let r = 0; r < t; r += 2) h(this, r, r + 1);
      return this;
    }),
    (i.prototype.swap32 = function () {
      const t = this.length;
      if (t % 4 != 0) throw new RangeError('Buffer size must be a multiple of 32-bits');
      for (let r = 0; r < t; r += 4) h(this, r, r + 3), h(this, r + 1, r + 2);
      return this;
    }),
    (i.prototype.swap64 = function () {
      const t = this.length;
      if (t % 8 != 0) throw new RangeError('Buffer size must be a multiple of 64-bits');
      for (let r = 0; r < t; r += 8)
        h(this, r, r + 7), h(this, r + 1, r + 6), h(this, r + 2, r + 5), h(this, r + 3, r + 4);
      return this;
    }),
    (i.prototype.toString = function () {
      const t = this.length;
      return 0 === t ? '' : 0 === arguments.length ? _(this, 0, t) : p.apply(this, arguments);
    }),
    (i.prototype.toLocaleString = i.prototype.toString),
    (i.prototype.equals = function (t) {
      if (!i.isBuffer(t)) throw new TypeError('Argument must be a Buffer');
      return this === t || 0 === i.compare(this, t);
    }),
    (i.prototype.inspect = function () {
      let t = '';
      const e = r.INSPECT_MAX_BYTES;
      return (
        (t = this.toString('hex', 0, e)
          .replace(/(.{2})/g, '$1 ')
          .trim()),
        this.length > e && (t += ' ... '),
        '<Buffer ' + t + '>'
      );
    }),
    e && (i.prototype[e] = i.prototype.inspect),
    (i.prototype.compare = function (t, r, e, n, $) {
      if ((G(t, Uint8Array) && (t = i.from(t, t.offset, t.byteLength)), !i.isBuffer(t)))
        throw new TypeError(
          'The "target" argument must be one of type Buffer or Uint8Array. Received type ' +
            typeof t
        );
      if (
        (void 0 === r && (r = 0),
        void 0 === e && (e = t ? t.length : 0),
        void 0 === n && (n = 0),
        void 0 === $ && ($ = this.length),
        r < 0 || e > t.length || n < 0 || $ > this.length)
      )
        throw new RangeError('out of range index');
      if (n >= $ && r >= e) return 0;
      if (n >= $) return -1;
      if (r >= e) return 1;
      if (this === t) return 0;
      let o = ($ >>>= 0) - (n >>>= 0);
      let a = (e >>>= 0) - (r >>>= 0);
      const u = Math.min(o, a);
      const f = this.slice(n, $);
      const s = t.slice(r, e);
      for (let t = 0; t < u; ++t)
        if (f[t] !== s[t]) {
          (o = f[t]), (a = s[t]);
          break;
        }
      return o < a ? -1 : a < o ? 1 : 0;
    }),
    (i.prototype.includes = function (t, r, e) {
      return -1 !== this.indexOf(t, r, e);
    }),
    (i.prototype.indexOf = function (t, r, e) {
      return g(this, t, r, e, !0);
    }),
    (i.prototype.lastIndexOf = function (t, r, e) {
      return g(this, t, r, e, !1);
    }),
    (i.prototype.write = function (t, r, e, n) {
      if (void 0 === r) (n = 'utf8'), (e = this.length), (r = 0);
      else if (void 0 === e && 'string' === typeof r) (n = r), (e = this.length), (r = 0);
      else {
        if (!isFinite(r))
          throw new Error(
            'Buffer.write(string, encoding, offset[, length]) is no longer supported'
          );
        (r >>>= 0),
          isFinite(e) ? ((e >>>= 0), void 0 === n && (n = 'utf8')) : ((n = e), (e = void 0));
      }
      const $ = this.length - r;
      if (
        ((void 0 === e || e > $) && (e = $), (t.length > 0 && (e < 0 || r < 0)) || r > this.length)
      )
        throw new RangeError('Attempt to write outside buffer bounds');
      n || (n = 'utf8');
      let i = !1;
      for (;;)
        switch (n) {
          case 'hex':
            return v(this, t, r, e);
          case 'utf8':
          case 'utf-8':
            return y(this, t, r, e);
          case 'ascii':
          case 'latin1':
          case 'binary':
            return m(this, t, r, e);
          case 'base64':
            return b(this, t, r, e);
          case 'ucs2':
          case 'ucs-2':
          case 'utf16le':
          case 'utf-16le':
            return w(this, t, r, e);
          default:
            if (i) throw new TypeError('Unknown encoding: ' + n);
            (n = ('' + n).toLowerCase()), (i = !0);
        }
    }),
    (i.prototype.toJSON = function () {
      return { type: 'Buffer', data: Array.prototype.slice.call(this._arr || this, 0) };
    });
  const I = 4096;
  function A(t, r, e) {
    let n = '';
    e = Math.min(t.length, e);
    for (let $ = r; $ < e; ++$) n += String.fromCharCode(127 & t[$]);
    return n;
  }
  function j(t, r, e) {
    let n = '';
    e = Math.min(t.length, e);
    for (let $ = r; $ < e; ++$) n += String.fromCharCode(t[$]);
    return n;
  }
  function O(t, r, e) {
    const n = t.length;
    (!r || r < 0) && (r = 0), (!e || e < 0 || e > n) && (e = n);
    let $ = '';
    for (let n = r; n < e; ++n) $ += W[t[n]];
    return $;
  }
  function x(t, r, e) {
    const n = t.slice(r, e);
    let $ = '';
    for (let t = 0; t < n.length - 1; t += 2) $ += String.fromCharCode(n[t] + 256 * n[t + 1]);
    return $;
  }
  function B(t, r, e) {
    if (t % 1 != 0 || t < 0) throw new RangeError('offset is not uint');
    if (t + r > e) throw new RangeError('Trying to access beyond buffer length');
  }
  function T(t, r, e, n, $, o) {
    if (!i.isBuffer(t)) throw new TypeError('"buffer" argument must be a Buffer instance');
    if (r > $ || r < o) throw new RangeError('"value" argument is out of bounds');
    if (e + n > t.length) throw new RangeError('Index out of range');
  }
  function k(t, r, e, n, $) {
    V(r, n, $, t, e, 7);
    let i = Number(r & BigInt(4294967295));
    (t[e++] = i), (i >>= 8), (t[e++] = i), (i >>= 8), (t[e++] = i), (i >>= 8), (t[e++] = i);
    let o = Number((r >> BigInt(32)) & BigInt(4294967295));
    return (
      (t[e++] = o), (o >>= 8), (t[e++] = o), (o >>= 8), (t[e++] = o), (o >>= 8), (t[e++] = o), e
    );
  }
  function U(t, r, e, n, $) {
    V(r, n, $, t, e, 7);
    let i = Number(r & BigInt(4294967295));
    (t[e + 7] = i), (i >>= 8), (t[e + 6] = i), (i >>= 8), (t[e + 5] = i), (i >>= 8), (t[e + 4] = i);
    let o = Number((r >> BigInt(32)) & BigInt(4294967295));
    return (
      (t[e + 3] = o),
      (o >>= 8),
      (t[e + 2] = o),
      (o >>= 8),
      (t[e + 1] = o),
      (o >>= 8),
      (t[e] = o),
      e + 8
    );
  }
  function N(t, r, e, n, $, i) {
    if (e + n > t.length) throw new RangeError('Index out of range');
    if (e < 0) throw new RangeError('Index out of range');
  }
  function L(t, r, e, n, $) {
    return (r = +r), (e >>>= 0), $ || N(t, 0, e, 4), ieee754.write(t, r, e, n, 23, 4), e + 4;
  }
  function S(t, r, e, n, $) {
    return (r = +r), (e >>>= 0), $ || N(t, 0, e, 8), ieee754.write(t, r, e, n, 52, 8), e + 8;
  }
  (i.prototype.slice = function (t, r) {
    const e = this.length;
    (t = ~~t) < 0 ? (t += e) < 0 && (t = 0) : t > e && (t = e),
      (r = void 0 === r ? e : ~~r) < 0 ? (r += e) < 0 && (r = 0) : r > e && (r = e),
      r < t && (r = t);
    const n = this.subarray(t, r);
    return Object.setPrototypeOf(n, i.prototype), n;
  }),
    (i.prototype.readUintLE = i.prototype.readUIntLE =
      function (t, r, e) {
        (t >>>= 0), (r >>>= 0), e || B(t, r, this.length);
        let n = this[t];
        let $ = 1;
        let i = 0;
        for (; ++i < r && ($ *= 256); ) n += this[t + i] * $;
        return n;
      }),
    (i.prototype.readUintBE = i.prototype.readUIntBE =
      function (t, r, e) {
        (t >>>= 0), (r >>>= 0), e || B(t, r, this.length);
        let n = this[t + --r];
        let $ = 1;
        for (; r > 0 && ($ *= 256); ) n += this[t + --r] * $;
        return n;
      }),
    (i.prototype.readUint8 = i.prototype.readUInt8 =
      function (t, r) {
        return (t >>>= 0), r || B(t, 1, this.length), this[t];
      }),
    (i.prototype.readUint16LE = i.prototype.readUInt16LE =
      function (t, r) {
        return (t >>>= 0), r || B(t, 2, this.length), this[t] | (this[t + 1] << 8);
      }),
    (i.prototype.readUint16BE = i.prototype.readUInt16BE =
      function (t, r) {
        return (t >>>= 0), r || B(t, 2, this.length), (this[t] << 8) | this[t + 1];
      }),
    (i.prototype.readUint32LE = i.prototype.readUInt32LE =
      function (t, r) {
        return (
          (t >>>= 0),
          r || B(t, 4, this.length),
          (this[t] | (this[t + 1] << 8) | (this[t + 2] << 16)) + 16777216 * this[t + 3]
        );
      }),
    (i.prototype.readUint32BE = i.prototype.readUInt32BE =
      function (t, r) {
        return (
          (t >>>= 0),
          r || B(t, 4, this.length),
          16777216 * this[t] + ((this[t + 1] << 16) | (this[t + 2] << 8) | this[t + 3])
        );
      }),
    (i.prototype.readBigUInt64LE = Y(function (t) {
      C((t >>>= 0), 'offset');
      const r = this[t];
      const e = this[t + 7];
      (void 0 !== r && void 0 !== e) || F(t, this.length - 8);
      const n = r + 256 * this[++t] + 65536 * this[++t] + this[++t] * 2 ** 24;
      const $ = this[++t] + 256 * this[++t] + 65536 * this[++t] + e * 2 ** 24;
      return BigInt(n) + (BigInt($) << BigInt(32));
    })),
    (i.prototype.readBigUInt64BE = Y(function (t) {
      C((t >>>= 0), 'offset');
      const r = this[t];
      const e = this[t + 7];
      (void 0 !== r && void 0 !== e) || F(t, this.length - 8);
      const n = r * 2 ** 24 + 65536 * this[++t] + 256 * this[++t] + this[++t];
      const $ = this[++t] * 2 ** 24 + 65536 * this[++t] + 256 * this[++t] + e;
      return (BigInt(n) << BigInt(32)) + BigInt($);
    })),
    (i.prototype.readIntLE = function (t, r, e) {
      (t >>>= 0), (r >>>= 0), e || B(t, r, this.length);
      let n = this[t];
      let $ = 1;
      let i = 0;
      for (; ++i < r && ($ *= 256); ) n += this[t + i] * $;
      return ($ *= 128), n >= $ && (n -= Math.pow(2, 8 * r)), n;
    }),
    (i.prototype.readIntBE = function (t, r, e) {
      (t >>>= 0), (r >>>= 0), e || B(t, r, this.length);
      let n = r;
      let $ = 1;
      let i = this[t + --n];
      for (; n > 0 && ($ *= 256); ) i += this[t + --n] * $;
      return ($ *= 128), i >= $ && (i -= Math.pow(2, 8 * r)), i;
    }),
    (i.prototype.readInt8 = function (t, r) {
      return (
        (t >>>= 0), r || B(t, 1, this.length), 128 & this[t] ? -1 * (255 - this[t] + 1) : this[t]
      );
    }),
    (i.prototype.readInt16LE = function (t, r) {
      (t >>>= 0), r || B(t, 2, this.length);
      const e = this[t] | (this[t + 1] << 8);
      return 32768 & e ? 4294901760 | e : e;
    }),
    (i.prototype.readInt16BE = function (t, r) {
      (t >>>= 0), r || B(t, 2, this.length);
      const e = this[t + 1] | (this[t] << 8);
      return 32768 & e ? 4294901760 | e : e;
    }),
    (i.prototype.readInt32LE = function (t, r) {
      return (
        (t >>>= 0),
        r || B(t, 4, this.length),
        this[t] | (this[t + 1] << 8) | (this[t + 2] << 16) | (this[t + 3] << 24)
      );
    }),
    (i.prototype.readInt32BE = function (t, r) {
      return (
        (t >>>= 0),
        r || B(t, 4, this.length),
        (this[t] << 24) | (this[t + 1] << 16) | (this[t + 2] << 8) | this[t + 3]
      );
    }),
    (i.prototype.readBigInt64LE = Y(function (t) {
      C((t >>>= 0), 'offset');
      const r = this[t];
      const e = this[t + 7];
      (void 0 !== r && void 0 !== e) || F(t, this.length - 8);
      const n = this[t + 4] + 256 * this[t + 5] + 65536 * this[t + 6] + (e << 24);
      return (
        (BigInt(n) << BigInt(32)) +
        BigInt(r + 256 * this[++t] + 65536 * this[++t] + this[++t] * 2 ** 24)
      );
    })),
    (i.prototype.readBigInt64BE = Y(function (t) {
      C((t >>>= 0), 'offset');
      const r = this[t];
      const e = this[t + 7];
      (void 0 !== r && void 0 !== e) || F(t, this.length - 8);
      const n = (r << 24) + 65536 * this[++t] + 256 * this[++t] + this[++t];
      return (
        (BigInt(n) << BigInt(32)) +
        BigInt(this[++t] * 2 ** 24 + 65536 * this[++t] + 256 * this[++t] + e)
      );
    })),
    (i.prototype.readFloatLE = function (t, r) {
      return (t >>>= 0), r || B(t, 4, this.length), ieee754.read(this, t, !0, 23, 4);
    }),
    (i.prototype.readFloatBE = function (t, r) {
      return (t >>>= 0), r || B(t, 4, this.length), ieee754.read(this, t, !1, 23, 4);
    }),
    (i.prototype.readDoubleLE = function (t, r) {
      return (t >>>= 0), r || B(t, 8, this.length), ieee754.read(this, t, !0, 52, 8);
    }),
    (i.prototype.readDoubleBE = function (t, r) {
      return (t >>>= 0), r || B(t, 8, this.length), ieee754.read(this, t, !1, 52, 8);
    }),
    (i.prototype.writeUintLE = i.prototype.writeUIntLE =
      function (t, r, e, n) {
        (t = +t), (r >>>= 0), (e >>>= 0), n || T(this, t, r, e, Math.pow(2, 8 * e) - 1, 0);
        let $ = 1;
        let i = 0;
        for (this[r] = 255 & t; ++i < e && ($ *= 256); ) this[r + i] = (t / $) & 255;
        return r + e;
      }),
    (i.prototype.writeUintBE = i.prototype.writeUIntBE =
      function (t, r, e, n) {
        (t = +t), (r >>>= 0), (e >>>= 0), n || T(this, t, r, e, Math.pow(2, 8 * e) - 1, 0);
        let $ = e - 1;
        let i = 1;
        for (this[r + $] = 255 & t; --$ >= 0 && (i *= 256); ) this[r + $] = (t / i) & 255;
        return r + e;
      }),
    (i.prototype.writeUint8 = i.prototype.writeUInt8 =
      function (t, r, e) {
        return (t = +t), (r >>>= 0), e || T(this, t, r, 1, 255, 0), (this[r] = 255 & t), r + 1;
      }),
    (i.prototype.writeUint16LE = i.prototype.writeUInt16LE =
      function (t, r, e) {
        return (
          (t = +t),
          (r >>>= 0),
          e || T(this, t, r, 2, 65535, 0),
          (this[r] = 255 & t),
          (this[r + 1] = t >>> 8),
          r + 2
        );
      }),
    (i.prototype.writeUint16BE = i.prototype.writeUInt16BE =
      function (t, r, e) {
        return (
          (t = +t),
          (r >>>= 0),
          e || T(this, t, r, 2, 65535, 0),
          (this[r] = t >>> 8),
          (this[r + 1] = 255 & t),
          r + 2
        );
      }),
    (i.prototype.writeUint32LE = i.prototype.writeUInt32LE =
      function (t, r, e) {
        return (
          (t = +t),
          (r >>>= 0),
          e || T(this, t, r, 4, 4294967295, 0),
          (this[r + 3] = t >>> 24),
          (this[r + 2] = t >>> 16),
          (this[r + 1] = t >>> 8),
          (this[r] = 255 & t),
          r + 4
        );
      }),
    (i.prototype.writeUint32BE = i.prototype.writeUInt32BE =
      function (t, r, e) {
        return (
          (t = +t),
          (r >>>= 0),
          e || T(this, t, r, 4, 4294967295, 0),
          (this[r] = t >>> 24),
          (this[r + 1] = t >>> 16),
          (this[r + 2] = t >>> 8),
          (this[r + 3] = 255 & t),
          r + 4
        );
      }),
    (i.prototype.writeBigUInt64LE = Y(function (t, r = 0) {
      return k(this, t, r, BigInt(0), BigInt('0xffffffffffffffff'));
    })),
    (i.prototype.writeBigUInt64BE = Y(function (t, r = 0) {
      return U(this, t, r, BigInt(0), BigInt('0xffffffffffffffff'));
    })),
    (i.prototype.writeIntLE = function (t, r, e, n) {
      if (((t = +t), (r >>>= 0), !n)) {
        const n = Math.pow(2, 8 * e - 1);
        T(this, t, r, e, n - 1, -n);
      }
      let $ = 0;
      let i = 1;
      let o = 0;
      for (this[r] = 255 & t; ++$ < e && (i *= 256); )
        t < 0 && 0 === o && 0 !== this[r + $ - 1] && (o = 1),
          (this[r + $] = (((t / i) >> 0) - o) & 255);
      return r + e;
    }),
    (i.prototype.writeIntBE = function (t, r, e, n) {
      if (((t = +t), (r >>>= 0), !n)) {
        const n = Math.pow(2, 8 * e - 1);
        T(this, t, r, e, n - 1, -n);
      }
      let $ = e - 1;
      let i = 1;
      let o = 0;
      for (this[r + $] = 255 & t; --$ >= 0 && (i *= 256); )
        t < 0 && 0 === o && 0 !== this[r + $ + 1] && (o = 1),
          (this[r + $] = (((t / i) >> 0) - o) & 255);
      return r + e;
    }),
    (i.prototype.writeInt8 = function (t, r, e) {
      return (
        (t = +t),
        (r >>>= 0),
        e || T(this, t, r, 1, 127, -128),
        t < 0 && (t = 255 + t + 1),
        (this[r] = 255 & t),
        r + 1
      );
    }),
    (i.prototype.writeInt16LE = function (t, r, e) {
      return (
        (t = +t),
        (r >>>= 0),
        e || T(this, t, r, 2, 32767, -32768),
        (this[r] = 255 & t),
        (this[r + 1] = t >>> 8),
        r + 2
      );
    }),
    (i.prototype.writeInt16BE = function (t, r, e) {
      return (
        (t = +t),
        (r >>>= 0),
        e || T(this, t, r, 2, 32767, -32768),
        (this[r] = t >>> 8),
        (this[r + 1] = 255 & t),
        r + 2
      );
    }),
    (i.prototype.writeInt32LE = function (t, r, e) {
      return (
        (t = +t),
        (r >>>= 0),
        e || T(this, t, r, 4, 2147483647, -2147483648),
        (this[r] = 255 & t),
        (this[r + 1] = t >>> 8),
        (this[r + 2] = t >>> 16),
        (this[r + 3] = t >>> 24),
        r + 4
      );
    }),
    (i.prototype.writeInt32BE = function (t, r, e) {
      return (
        (t = +t),
        (r >>>= 0),
        e || T(this, t, r, 4, 2147483647, -2147483648),
        t < 0 && (t = 4294967295 + t + 1),
        (this[r] = t >>> 24),
        (this[r + 1] = t >>> 16),
        (this[r + 2] = t >>> 8),
        (this[r + 3] = 255 & t),
        r + 4
      );
    }),
    (i.prototype.writeBigInt64LE = Y(function (t, r = 0) {
      return k(this, t, r, -BigInt('0x8000000000000000'), BigInt('0x7fffffffffffffff'));
    })),
    (i.prototype.writeBigInt64BE = Y(function (t, r = 0) {
      return U(this, t, r, -BigInt('0x8000000000000000'), BigInt('0x7fffffffffffffff'));
    })),
    (i.prototype.writeFloatLE = function (t, r, e) {
      return L(this, t, r, !0, e);
    }),
    (i.prototype.writeFloatBE = function (t, r, e) {
      return L(this, t, r, !1, e);
    }),
    (i.prototype.writeDoubleLE = function (t, r, e) {
      return S(this, t, r, !0, e);
    }),
    (i.prototype.writeDoubleBE = function (t, r, e) {
      return S(this, t, r, !1, e);
    }),
    (i.prototype.copy = function (t, r, e, n) {
      if (!i.isBuffer(t)) throw new TypeError('argument should be a Buffer');
      if (
        (e || (e = 0),
        n || 0 === n || (n = this.length),
        r >= t.length && (r = t.length),
        r || (r = 0),
        n > 0 && n < e && (n = e),
        n === e)
      )
        return 0;
      if (0 === t.length || 0 === this.length) return 0;
      if (r < 0) throw new RangeError('targetStart out of bounds');
      if (e < 0 || e >= this.length) throw new RangeError('Index out of range');
      if (n < 0) throw new RangeError('sourceEnd out of bounds');
      n > this.length && (n = this.length), t.length - r < n - e && (n = t.length - r + e);
      const $ = n - e;
      return (
        this === t && 'function' === typeof Uint8Array.prototype.copyWithin
          ? this.copyWithin(r, e, n)
          : Uint8Array.prototype.set.call(t, this.subarray(e, n), r),
        $
      );
    }),
    (i.prototype.fill = function (t, r, e, n) {
      if ('string' === typeof t) {
        if (
          ('string' === typeof r
            ? ((n = r), (r = 0), (e = this.length))
            : 'string' === typeof e && ((n = e), (e = this.length)),
          void 0 !== n && 'string' !== typeof n)
        )
          throw new TypeError('encoding must be a string');
        if ('string' === typeof n && !i.isEncoding(n))
          throw new TypeError('Unknown encoding: ' + n);
        if (1 === t.length) {
          const r = t.charCodeAt(0);
          (('utf8' === n && r < 128) || 'latin1' === n) && (t = r);
        }
      } else 'number' === typeof t ? (t &= 255) : 'boolean' === typeof t && (t = Number(t));
      if (r < 0 || this.length < r || this.length < e) throw new RangeError('Out of range index');
      if (e <= r) return this;
      let $;
      if (
        ((r >>>= 0),
        (e = void 0 === e ? this.length : e >>> 0),
        t || (t = 0),
        'number' === typeof t)
      )
        for ($ = r; $ < e; ++$) this[$] = t;
      else {
        const o = i.isBuffer(t) ? t : i.from(t, n);
        const a = o.length;
        if (0 === a) throw new TypeError('The value "' + t + '" is invalid for argument "value"');
        for ($ = 0; $ < e - r; ++$) this[$ + r] = o[$ % a];
      }
      return this;
    });
  const P = {};
  function R(t, r, e) {
    P[t] = class extends e {
      constructor() {
        super(),
          Object.defineProperty(this, 'message', {
            value: r.apply(this, arguments),
            writable: !0,
            configurable: !0,
          }),
          (this.name = `${this.name} [${t}]`),
          this.stack,
          delete this.name;
      }
      get code() {
        return t;
      }
      set code(t) {
        Object.defineProperty(this, 'code', {
          configurable: !0,
          enumerable: !0,
          value: t,
          writable: !0,
        });
      }
      toString() {
        return `${this.name} [${t}]: ${this.message}`;
      }
    };
  }
  function M(t) {
    let r = '';
    let e = t.length;
    const n = '-' === t[0] ? 1 : 0;
    for (; e >= n + 4; e -= 3) r = `_${t.slice(e - 3, e)}${r}`;
    return `${t.slice(0, e)}${r}`;
  }
  function V(t, r, e, n, $, i) {
    if (t > e || t < r) {
      const n = 'bigint' === typeof r ? 'n' : '';
      let $;
      throw (
        (($ =
          i > 3
            ? 0 === r || r === BigInt(0)
              ? `>= 0${n} and < 2${n} ** ${8 * (i + 1)}${n}`
              : `>= -(2${n} ** ${8 * (i + 1) - 1}${n}) and < 2 ** ${8 * (i + 1) - 1}${n}`
            : `>= ${r}${n} and <= ${e}${n}`),
        new P.ERR_OUT_OF_RANGE('value', $, t))
      );
    }
    !(function (t, r, e) {
      C(r, 'offset'), (void 0 !== t[r] && void 0 !== t[r + e]) || F(r, t.length - (e + 1));
    })(n, $, i);
  }
  function C(t, r) {
    if ('number' !== typeof t) throw new P.ERR_INVALID_ARG_TYPE(r, 'number', t);
  }
  function F(t, r, e) {
    if (Math.floor(t) !== t)
      throw (C(t, e), new P.ERR_OUT_OF_RANGE(e || 'offset', 'an integer', t));
    if (r < 0) throw new P.ERR_BUFFER_OUT_OF_BOUNDS();
    throw new P.ERR_OUT_OF_RANGE(e || 'offset', `>= ${e ? 1 : 0} and <= ${r}`, t);
  }
  R(
    'ERR_BUFFER_OUT_OF_BOUNDS',
    function (t) {
      return t
        ? `${t} is outside of buffer bounds`
        : 'Attempt to access memory outside buffer bounds';
    },
    RangeError
  ),
    R(
      'ERR_INVALID_ARG_TYPE',
      function (t, r) {
        return `The "${t}" argument must be of type number. Received type ${typeof r}`;
      },
      TypeError
    ),
    R(
      'ERR_OUT_OF_RANGE',
      function (t, r, e) {
        let n = `The value of "${t}" is out of range.`;
        let $ = e;
        return (
          Number.isInteger(e) && Math.abs(e) > 2 ** 32
            ? ($ = M(String(e)))
            : 'bigint' === typeof e &&
              (($ = String(e)),
              (e > BigInt(2) ** BigInt(32) || e < -(BigInt(2) ** BigInt(32))) && ($ = M($)),
              ($ += 'n')),
          (n += ` It must be ${r}. Received ${$}`),
          n
        );
      },
      RangeError
    );
  const q = /[^+/0-9A-Za-z-_]/g;
  function z(t, r) {
    let e;
    r = r || 1 / 0;
    const n = t.length;
    let $ = null;
    const i = [];
    for (let o = 0; o < n; ++o) {
      if (((e = t.charCodeAt(o)), e > 55295 && e < 57344)) {
        if (!$) {
          if (e > 56319) {
            (r -= 3) > -1 && i.push(239, 191, 189);
            continue;
          }
          if (o + 1 === n) {
            (r -= 3) > -1 && i.push(239, 191, 189);
            continue;
          }
          $ = e;
          continue;
        }
        if (e < 56320) {
          (r -= 3) > -1 && i.push(239, 191, 189), ($ = e);
          continue;
        }
        e = 65536 + ((($ - 55296) << 10) | (e - 56320));
      } else $ && (r -= 3) > -1 && i.push(239, 191, 189);
      if ((($ = null), e < 128)) {
        if ((r -= 1) < 0) break;
        i.push(e);
      } else if (e < 2048) {
        if ((r -= 2) < 0) break;
        i.push((e >> 6) | 192, (63 & e) | 128);
      } else if (e < 65536) {
        if ((r -= 3) < 0) break;
        i.push((e >> 12) | 224, ((e >> 6) & 63) | 128, (63 & e) | 128);
      } else {
        if (!(e < 1114112)) throw new Error('Invalid code point');
        if ((r -= 4) < 0) break;
        i.push((e >> 18) | 240, ((e >> 12) & 63) | 128, ((e >> 6) & 63) | 128, (63 & e) | 128);
      }
    }
    return i;
  }
  function D(t) {
    return base64Js.toByteArray(
      (function (t) {
        if ((t = (t = t.split('=')[0]).trim().replace(q, '')).length < 2) return '';
        for (; t.length % 4 != 0; ) t += '=';
        return t;
      })(t)
    );
  }
  function H(t, r, e, n) {
    let $;
    for ($ = 0; $ < n && !($ + e >= r.length || $ >= t.length); ++$) r[$ + e] = t[$];
    return $;
  }
  function G(t, r) {
    return (
      t instanceof r ||
      (null != t &&
        null != t.constructor &&
        null != t.constructor.name &&
        t.constructor.name === r.name)
    );
  }
  function J(t) {
    return t != t;
  }
  const W = (function () {
    const t = '0123456789abcdef';
    const r = new Array(256);
    for (let e = 0; e < 16; ++e) {
      const n = 16 * e;
      for (let $ = 0; $ < 16; ++$) r[n + $] = t[e] + t[$];
    }
    return r;
  })();
  function Y(t) {
    return 'undefined' === typeof BigInt ? Q : t;
  }
  function Q() {
    throw new Error('BigInt not supported');
  }
});
const o$C = buffer.Buffer;
function f$J() {
  throw new Error('not implemented');
}
const n$R = e$J;
const m$A = o$C;
const p$x = f$J;
const s$w = n$R() ? m$A : p$x;
const r$j = y$n;
const a$1n = 'function' === typeof Float64Array;
function o$B(t) {
  return (a$1n && t instanceof Float64Array) || '[object Float64Array]' === r$j(t);
}
const n$Q = o$B;
const t$u = 'function' === typeof Float64Array ? Float64Array : null;
const a$1m = n$Q;
const o$A = t$u;
function n$P() {
  let t;
  let r;
  if ('function' !== typeof o$A) return !1;
  try {
    (r = new o$A([1, 3.14, -3.14, NaN])),
      (t = a$1m(r) && 1 === r[0] && 3.14 === r[1] && -3.14 === r[2] && r[3] != r[3]);
  } catch (r) {
    t = !1;
  }
  return t;
}
const f$I = n$P;
const t$t = 'function' === typeof Float64Array ? Float64Array : null;
function o$z() {
  throw new Error('not implemented');
}
const e$I = f$I;
const n$O = t$t;
const l$t = o$z;
const f$H = e$I() ? n$O : l$t;
const r$i = y$n;
const a$1l = 'function' === typeof Float32Array;
function o$y(t) {
  return (a$1l && t instanceof Float32Array) || '[object Float32Array]' === r$i(t);
}
const n$N = o$y;
const a$1k = 'function' === typeof Float32Array ? Float32Array : null;
const o$x = n$N;
const n$M = I$c;
const f$G = a$1k;
function e$H() {
  let t;
  let r;
  if ('function' !== typeof f$G) return !1;
  try {
    (r = new f$G([1, 3.14, -3.14, 5e40])),
      (t =
        o$x(r) &&
        1 === r[0] &&
        3.140000104904175 === r[1] &&
        -3.140000104904175 === r[2] &&
        r[3] === n$M);
  } catch (r) {
    t = !1;
  }
  return t;
}
const i$L = e$H;
const t$s = 'function' === typeof Float32Array ? Float32Array : null;
function o$w() {
  throw new Error('not implemented');
}
const e$G = i$L;
const n$L = t$s;
const l$s = o$w;
const f$F = e$G() ? n$L : l$s;
const r$h = y$n;
const n$K = 'function' === typeof Int16Array;
function a$1j(t) {
  return (n$K && t instanceof Int16Array) || '[object Int16Array]' === r$h(t);
}
const o$v = a$1j;
const a$1i = 32767;
const a$1h = -32768;
const a$1g = 'function' === typeof Int16Array ? Int16Array : null;
const o$u = o$v;
const i$K = a$1i;
const f$E = a$1h;
const m$z = a$1g;
function s$v() {
  let t;
  let r;
  if ('function' !== typeof m$z) return !1;
  try {
    (r = new m$z([1, 3.14, -3.14, i$K + 1])),
      (t = o$u(r) && 1 === r[0] && 3 === r[1] && -3 === r[2] && r[3] === f$E);
  } catch (r) {
    t = !1;
  }
  return t;
}
const c$q = s$v;
const t$r = 'function' === typeof Int16Array ? Int16Array : null;
function n$J() {
  throw new Error('not implemented');
}
const a$1f = c$q;
const e$F = t$r;
const p$w = n$J;
const f$D = a$1f() ? e$F : p$w;
const r$g = y$n;
const n$I = 'function' === typeof Int32Array;
function a$1e(t) {
  return (n$I && t instanceof Int32Array) || '[object Int32Array]' === r$g(t);
}
const o$t = a$1e;
const a$1d = 2147483647;
const a$1c = -2147483648;
const a$1b = 'function' === typeof Int32Array ? Int32Array : null;
const o$s = o$t;
const i$J = a$1d;
const f$C = a$1c;
const m$y = a$1b;
function s$u() {
  let t;
  let r;
  if ('function' !== typeof m$y) return !1;
  try {
    (r = new m$y([1, 3.14, -3.14, i$J + 1])),
      (t = o$s(r) && 1 === r[0] && 3 === r[1] && -3 === r[2] && r[3] === f$C);
  } catch (r) {
    t = !1;
  }
  return t;
}
const c$p = s$u;
const t$q = 'function' === typeof Int32Array ? Int32Array : null;
function n$H() {
  throw new Error('not implemented');
}
const a$1a = c$p;
const e$E = t$q;
const p$v = n$H;
const f$B = a$1a() ? e$E : p$v;
const r$f = y$n;
const n$G = 'function' === typeof Int8Array;
function a$19(t) {
  return (n$G && t instanceof Int8Array) || '[object Int8Array]' === r$f(t);
}
const o$r = a$19;
const a$18 = 127;
const a$17 = -128;
const a$16 = 'function' === typeof Int8Array ? Int8Array : null;
const o$q = o$r;
const i$I = a$18;
const f$A = a$17;
const m$x = a$16;
function s$t() {
  let t;
  let r;
  if ('function' !== typeof m$x) return !1;
  try {
    (r = new m$x([1, 3.14, -3.14, i$I + 1])),
      (t = o$q(r) && 1 === r[0] && 3 === r[1] && -3 === r[2] && r[3] === f$A);
  } catch (r) {
    t = !1;
  }
  return t;
}
const c$o = s$t;
const t$p = 'function' === typeof Int8Array ? Int8Array : null;
function n$F() {
  throw new Error('not implemented');
}
const a$15 = c$o;
const e$D = t$p;
const p$u = n$F;
const f$z = a$15() ? e$D : p$u;
const r$e = y$n;
const n$E = 'function' === typeof Uint16Array;
function a$14(t) {
  return (n$E && t instanceof Uint16Array) || '[object Uint16Array]' === r$e(t);
}
const i$H = a$14;
const a$13 = 65535;
const n$D = 'function' === typeof Uint16Array ? Uint16Array : null;
const a$12 = i$H;
const i$G = a$13;
const o$p = n$D;
function f$y() {
  let t;
  let r;
  if ('function' !== typeof o$p) return !1;
  try {
    (r = new o$p((r = [1, 3.14, -3.14, i$G + 1, i$G + 2]))),
      (t = a$12(r) && 1 === r[0] && 3 === r[1] && r[2] === i$G - 2 && 0 === r[3] && 1 === r[4]);
  } catch (r) {
    t = !1;
  }
  return t;
}
const u$G = f$y;
const t$o = 'function' === typeof Uint16Array ? Uint16Array : null;
function n$C() {
  throw new Error('not implemented');
}
const a$11 = u$G;
const e$C = t$o;
const i$F = n$C;
const p$t = a$11() ? e$C : i$F;
const r$d = y$n;
const n$B = 'function' === typeof Uint32Array;
function a$10(t) {
  return (n$B && t instanceof Uint32Array) || '[object Uint32Array]' === r$d(t);
}
const i$E = a$10;
const n$A = 'function' === typeof Uint32Array ? Uint32Array : null;
const a$$ = i$E;
const i$D = a$1w;
const o$o = n$A;
function f$x() {
  let t;
  let r;
  if ('function' !== typeof o$o) return !1;
  try {
    (r = new o$o((r = [1, 3.14, -3.14, i$D + 1, i$D + 2]))),
      (t = a$$(r) && 1 === r[0] && 3 === r[1] && r[2] === i$D - 2 && 0 === r[3] && 1 === r[4]);
  } catch (r) {
    t = !1;
  }
  return t;
}
const u$F = f$x;
const t$n = 'function' === typeof Uint32Array ? Uint32Array : null;
function n$z() {
  throw new Error('not implemented');
}
const a$_ = u$F;
const e$B = t$n;
const i$C = n$z;
const p$s = a$_() ? e$B : i$C;
const r$c = y$n;
const n$y = 'function' === typeof Uint8Array;
function a$Z(t) {
  return (n$y && t instanceof Uint8Array) || '[object Uint8Array]' === r$c(t);
}
const i$B = a$Z;
const a$Y = 255;
const n$x = 'function' === typeof Uint8Array ? Uint8Array : null;
const a$X = i$B;
const i$A = a$Y;
const o$n = n$x;
function f$w() {
  let t;
  let r;
  if ('function' !== typeof o$n) return !1;
  try {
    (r = new o$n((r = [1, 3.14, -3.14, i$A + 1, i$A + 2]))),
      (t = a$X(r) && 1 === r[0] && 3 === r[1] && r[2] === i$A - 2 && 0 === r[3] && 1 === r[4]);
  } catch (r) {
    t = !1;
  }
  return t;
}
const u$E = f$w;
const t$m = 'function' === typeof Uint8Array ? Uint8Array : null;
function n$w() {
  throw new Error('not implemented');
}
const a$W = u$E;
const e$A = t$m;
const i$z = n$w;
const p$r = a$W() ? e$A : i$z;
const r$b = y$n;
const a$V = 'function' === typeof Uint8ClampedArray;
function n$v(t) {
  return (a$V && t instanceof Uint8ClampedArray) || '[object Uint8ClampedArray]' === r$b(t);
}
const e$z = n$v;
const t$l = 'function' === typeof Uint8ClampedArray ? Uint8ClampedArray : null;
const n$u = e$z;
const a$U = t$l;
function e$y() {
  let t;
  let r;
  if ('function' !== typeof a$U) return !1;
  try {
    (r = new a$U([-1, 0, 1, 3.14, 4.99, 255, 256])),
      (t =
        n$u(r) &&
        0 === r[0] &&
        0 === r[1] &&
        1 === r[2] &&
        3 === r[3] &&
        5 === r[4] &&
        255 === r[5] &&
        255 === r[6]);
  } catch (r) {
    t = !1;
  }
  return t;
}
const i$y = e$y;
const t$k = 'function' === typeof Uint8ClampedArray ? Uint8ClampedArray : null;
function a$T() {
  throw new Error('not implemented');
}
const n$t = i$y;
const o$m = t$k;
const p$q = a$T;
const i$x = n$t() ? o$m : p$q;
const y$a = s$w;
const j$l = f$H;
const s$s = f$F;
const l$r = f$D;
const e$x = f$B;
const c$n = f$z;
const b$g = p$t;
const v$k = p$s;
const d$k = p$r;
const g$f = i$x;
const x$h = {
  binary: y$a,
  float64: j$l,
  float32: s$s,
  generic: Array,
  int16: l$r,
  int32: e$x,
  int8: c$n,
  uint16: b$g,
  uint32: v$k,
  uint8: d$k,
  uint8c: g$f,
};
const A$c = x$h;
function h$h(t) {
  return A$c[t] || null;
}
const k$h = h$h;
const t$j = f$12;
const i$w = s$w;
const o$l = t$j(i$w.allocUnsafe);
const a$S = m$S;
const s$r = s$w;
function u$D(t) {
  if (!a$S(t))
    throw new TypeError('invalid argument. Must provide a nonnegative integer. Value: `' + t + '`');
  return s$r.allocUnsafe(t);
}
const f$v = m$S;
const v$j = s$w;
function l$q(t) {
  if (!f$v(t))
    throw new TypeError('invalid argument. Must provide a nonnegative integer. Value: `' + t + '`');
  return new v$j(t);
}
const m$w = o$l;
const p$p = u$D;
const c$m = l$q;
const d$j = m$w ? p$p : c$m;
function n$s(t) {
  let r;
  for (r = 0; r < t.length; r++) t[r] = 0;
  return t;
}
const e$w = k$h;
const o$k = d$j;
const t$i = n$s;
function u$C(t, r) {
  let e;
  let n;
  let $;
  if ('generic' === t) {
    for (n = [], $ = 0; $ < r; $++) n.push(0);
    return n;
  }
  return 'binary' === t ? t$i(o$k(r)) : (e = e$w(t)) ? new e(r) : null;
}
const a$R = u$C;
const l$p = {
  Buffer: 'binary',
  Float32Array: 'float32',
  Float64Array: 'float64',
  Array: 'generic',
  Int16Array: 'int16',
  Int32Array: 'int32',
  Int8Array: 'int8',
  Object: 'generic',
  Uint16Array: 'uint16',
  Uint32Array: 'uint32',
  Uint8Array: 'uint8',
  Uint8ClampedArray: 'uint8c',
};
const p$o = f$H;
const j$k = f$F;
const c$l = p$s;
const A$b = f$B;
const b$f = p$t;
const g$e = f$D;
const U$8 = p$r;
const v$i = i$x;
const I$9 = f$z;
const d$i = [p$o, j$k, A$b, c$l, g$e, b$f, I$9, U$8, v$i];
const F$b = ['float64', 'float32', 'int32', 'uint32', 'int16', 'uint16', 'int8', 'uint8', 'uint8c'];
const h$g = f$15;
const x$g = e$1c;
const B$b = s$Q;
const C$b = l$p;
const O$7 = d$i;
const k$g = F$b;
const q$d = k$g.length;
function w$e(t) {
  let r;
  if (x$g(t)) return 'generic';
  if (h$g(t)) return 'binary';
  for (r = 0; r < q$d; r++) if (t instanceof O$7[r]) return k$g[r];
  return C$b[B$b(t)] || null;
}
const z$9 = w$e;
const n$r = e$1c;
function t$h(t, r) {
  const e = r[0];
  return n$r(e) && (t.push(e.length), t$h(t, e)), t;
}
function e$v(t, r, e, n, $) {
  let i;
  let o;
  let a;
  for (i = r[e], a = 0; a < n.length; a++) {
    if (((o = n[a]), !n$r(o) || o.length !== i)) return e;
    if ($ && (o = e$v(t, r, e + 1, o, e + 1 < t - 1)) < t) return o;
  }
  return t;
}
function a$Q(t) {
  let r;
  let e;
  if (!n$r(t)) throw new TypeError('invalid argument. Must provide an array. Value: `' + t + '`.');
  return t$h((r = [t.length]), t), (e = r.length) > 1 && (r.length = e$v(e, r, 1, t, e > 2)), r;
}
const u$B = a$Q;
const o$j = O$9;
const e$u = y$n;
function f$u(t) {
  if ('object' !== typeof t || null === t) return !1;
  if (t instanceof Error) return !0;
  for (; t; ) {
    if ('[object Error]' === e$u(t)) return !0;
    t = o$j(t);
  }
  return !1;
}
const i$v = f$u;
const a$P = /^\/((?:\\\/|[^\/])+)\/([imgy]*)$/;
const i$u = j$u.isPrimitive;
const t$g = a$P;
function n$q(t) {
  if (!i$u(t))
    throw new TypeError(
      'invalid argument. Must provide a regular expression string. Value: `' + t + '`.'
    );
  return (t = t$g.exec(t)) ? new RegExp(t[1], t[2]) : null;
}
const s$q = n$q;
const t$f = void 0 !== Object.getOwnPropertyNames;
const r$a = Object.getOwnPropertyNames;
function n$p(t) {
  return r$a(Object(t));
}
const o$i = tr$4;
function a$O(t) {
  return o$i(Object(t));
}
const O$6 = t$f;
const j$j = n$p;
const u$A = a$O;
const b$e = O$6 ? j$j : u$A;
const e$t = void 0 !== Object.getOwnPropertyDescriptor;
const t$e = Object.getOwnPropertyDescriptor;
function n$o(t, r) {
  let e;
  return null == t || void 0 === (e = t$e(t, r)) ? null : e;
}
const o$h = e$1e;
function a$N(t, r) {
  return o$h(t, r) ? { configurable: !0, enumerable: !0, writable: !0, value: t[r] } : null;
}
const u$z = e$t;
const i$t = n$o;
const p$n = a$N;
const c$k = u$z ? i$t : p$n;
const t$d = f$12;
const f$t = s$w;
const i$s = t$d(f$t.from);
const n$n = f$15;
const u$y = s$w;
function a$M(t) {
  if (!n$n(t)) throw new TypeError('invalid argument. Must provide a Buffer. Value: `' + t + '`');
  return u$y.from(t);
}
const s$p = f$15;
const m$v = s$w;
function p$m(t) {
  if (!s$p(t)) throw new TypeError('invalid argument. Must provide a Buffer. Value: `' + t + '`');
  return new m$v(t);
}
const d$h = i$s;
const l$o = a$M;
const w$d = p$m;
const c$j = d$h ? l$o : w$d;
const E$9 = f$z;
const k$f = p$r;
const S$6 = i$x;
const A$a = f$D;
const F$a = p$t;
const D$a = f$B;
const M$7 = p$s;
const P$7 = f$F;
const T$6 = f$H;
function V$6(t) {
  return new E$9(t);
}
function q$c(t) {
  return new k$f(t);
}
function B$a(t) {
  return new S$6(t);
}
function C$a(t) {
  return new A$a(t);
}
function G$9(t) {
  return new F$a(t);
}
function H$a(t) {
  return new D$a(t);
}
function I$8(t) {
  return new M$7(t);
}
function J$8(t) {
  return new P$7(t);
}
function K$7(t) {
  return new T$6(t);
}
function L$8() {
  return {
    int8array: V$6,
    uint8array: q$c,
    uint8clampedarray: B$a,
    int16array: C$a,
    uint16array: G$9,
    int32array: H$a,
    uint32array: I$8,
    float32array: J$8,
    float64array: K$7,
  };
}
const N$d = L$8();
const Q$6 = e$1e;
const R$7 = e$1c;
const U$7 = f$15;
const W$6 = i$v;
const X$6 = b$r;
const Y$6 = s$q;
const Z$6 = m$E;
const $$6 = tr$4;
const _$7 = b$e;
const rr$5 = c$k;
const er$4 = O$9;
const tr$3 = v$C;
const nr$3 = c$j;
const or$3 = N$d;
function ar$3(t) {
  let r;
  let e;
  let n;
  let $;
  let i;
  let o;
  let a;
  let u;
  for (
    r = [], $ = [], a = Object.create(er$4(t)), r.push(t), $.push(a), e = _$7(t), u = 0;
    u < e.length;
    u++
  )
    (n = e[u]),
      (i = rr$5(t, n)),
      Q$6(i, 'value') && ((o = R$7(t[n]) ? [] : {}), (i.value = fr$3(t[n], o, r, $, -1))),
      tr$3(a, n, i);
  return (
    Object.isExtensible(t) || Object.preventExtensions(a),
    Object.isSealed(t) && Object.seal(a),
    Object.isFrozen(t) && Object.freeze(a),
    a
  );
}
function ir$3(t) {
  let r;
  let e;
  let n;
  let $;
  let i;
  let o;
  const a = [];
  const u = [];
  for (
    i = new t.constructor(t.message),
      a.push(t),
      u.push(i),
      t.stack && (i.stack = t.stack),
      t.code && (i.code = t.code),
      t.errno && (i.errno = t.errno),
      t.syscall && (i.syscall = t.syscall),
      r = $$6(t),
      o = 0;
    o < r.length;
    o++
  )
    ($ = r[o]),
      (e = rr$5(t, $)),
      Q$6(e, 'value') && ((n = R$7(t[$]) ? [] : {}), (e.value = fr$3(t[$], n, a, u, -1))),
      tr$3(i, $, e);
  return i;
}
function fr$3(t, r, e, n, $) {
  let i;
  let o;
  let a;
  let u;
  let f;
  let s;
  let c;
  let l;
  let p;
  let h;
  if ((($ -= 1), 'object' !== typeof t || null === t)) return t;
  if (U$7(t)) return nr$3(t);
  if (W$6(t)) return ir$3(t);
  if ('date' === (a = X$6(t))) return new Date(+t);
  if ('regexp' === a) return Y$6(t.toString());
  if ('set' === a) return new Set(t);
  if ('map' === a) return new Map(t);
  if ('string' === a || 'boolean' === a || 'number' === a) return t.valueOf();
  if ((f = or$3[a])) return f(t);
  if ('array' !== a && 'object' !== a) return 'function' === typeof Object.freeze ? ar$3(t) : {};
  if (((o = $$6(t)), $ > 0))
    for (i = a, h = 0; h < o.length; h++)
      (l = t[(s = o[h])]),
        (a = X$6(l)),
        'object' !== typeof l || null === l || ('array' !== a && 'object' !== a) || U$7(l)
          ? 'object' === i
            ? ((u = rr$5(t, s)), Q$6(u, 'value') && (u.value = fr$3(l)), tr$3(r, s, u))
            : (r[s] = fr$3(l))
          : -1 === (p = Z$6(e, l))
          ? ((c = R$7(l) ? new Array(l.length) : {}),
            e.push(l),
            n.push(c),
            'array' === i
              ? (r[s] = fr$3(l, c, e, n, $))
              : ((u = rr$5(t, s)),
                Q$6(u, 'value') && (u.value = fr$3(l, c, e, n, $)),
                tr$3(r, s, u)))
          : (r[s] = n[p]);
  else if ('array' === a) for (h = 0; h < o.length; h++) r[(s = o[h])] = t[s];
  else for (h = 0; h < o.length; h++) (s = o[h]), (u = rr$5(t, s)), tr$3(r, s, u);
  return (
    Object.isExtensible(t) || Object.preventExtensions(r),
    Object.isSealed(t) && Object.seal(r),
    Object.isFrozen(t) && Object.freeze(r),
    r
  );
}
const sr$2 = e$1c;
const ur$2 = m$S.isPrimitive;
const mr$2 = I$c;
const pr$2 = fr$3;
function cr$2(t, r) {
  let e;
  if (arguments.length > 1) {
    if (!ur$2(r))
      throw new TypeError(
        'invalid argument. `level` must be a nonnegative integer. Value: `' + r + '`.'
      );
    if (0 === r) return t;
  } else r = mr$2;
  return (e = sr$2(t) ? new Array(t.length) : {}), pr$2(t, e, [t], [e], r);
}
const lr$2 = cr$2;
const e$s = 17976931348623157e292;
const o$g = m$O;
const t$c = o$1b;
const s$o = e$19;
const m$u = s$o(o$g);
t$c(m$u, 'primitives', s$o(o$g.isPrimitive)), t$c(m$u, 'objects', s$o(o$g.isObject));
const u$x = e$s;
const m$t = { copy: !1, depth: u$x };
const f$s = j$v;
const y$9 = e$1e;
const v$h = y$k.isPrimitive;
const c$i = m$S.isPrimitive;
function l$n(t, r) {
  return f$s(r)
    ? y$9(r, 'depth') && ((t.depth = r.depth), !c$i(t.depth))
      ? new TypeError(
          'invalid option. `depth` option must be a nonnegative integer. Option: `' + t.depth + '`.'
        )
      : y$9(r, 'copy') && ((t.copy = r.copy), !v$h(t.copy))
      ? new TypeError(
          'invalid option. `copy` option must be a boolean primitive. Option: `' + t.copy + '`.'
        )
      : null
    : new TypeError('invalid argument. Options argument must be an object. Value: `' + r + '`.');
}
const h$f = e$1c;
function d$g(t, r, e) {
  let n;
  let $;
  for ($ = 0; $ < r.length; $++) (n = r[$]), e && h$f(n) ? d$g(t, n, e - 1) : t.push(n);
  return t;
}
const g$d = lr$2;
const w$c = e$1c;
const b$d = m$t;
const j$i = l$n;
const E$8 = d$g;
function T$5(t, r) {
  let e;
  let n;
  let $;
  if (!w$c(t))
    throw new TypeError('invalid argument. First argument must be an array. Value: `' + t + '`.');
  if (((e = { copy: b$d.copy, depth: b$d.depth }), arguments.length > 1 && (n = j$i(e, r))))
    throw n;
  return ($ = 0 === e.depth ? t : E$8([], t, e.depth)), e.copy ? g$d($) : $;
}
function V$5(t) {
  let r;
  let e;
  let n;
  let $;
  for (
    n = 'return function flattenArray(x){', e = (r = t.length) - 1, n += 'var o=[];var ', $ = 0;
    $ < r;
    $++
  )
    (n += 'i' + $), (n += $ < e ? ',' : ';');
  for ($ = 0; $ < r; $++) n += 'for(i' + $ + '=0;i' + $ + '<' + t[$] + ';i' + $ + '++){';
  for (n += 'o.push(x', $ = 0; $ < r; $++) n += '[i' + $ + ']';
  for (n += ');', $ = 0; $ < r; $++) n += '}';
  return (
    (n += 'return o;'),
    (n += '}'),
    (n += '//# sourceURL=flatten_array.gen_fcn.js'),
    new Function(n)()
  );
}
const O$5 = e$1c;
function x$f(t) {
  return function (r) {
    if (!O$5(r))
      throw new TypeError('invalid argument. Must provide an array. Value: `' + r + '`.');
    return t(r);
  };
}
const F$9 = e$1c;
const P$6 = lr$2;
function M$6(t) {
  return function (r) {
    if (!F$9(r))
      throw new TypeError('invalid argument. Must provide an array. Value: `' + r + '`.');
    return P$6(t(r));
  };
}
const _$6 = m$u.primitives;
const A$9 = j$v;
const L$7 = e$1e;
const R$6 = y$k.isPrimitive;
const U$6 = m$t;
const k$e = V$5;
const q$b = x$f;
const z$8 = M$6;
function B$9(t, r) {
  let e;
  let n;
  if (!_$6(t))
    throw new TypeError(
      'invalid argument. First argument must be an array of positive integers. Value: `' + t + '`.'
    );
  if (((e = U$6.copy), arguments.length > 1)) {
    if (!A$9(r))
      throw new TypeError(
        'invalid argument. Options argument must be an object. Value: `' + r + '`.'
      );
    if (L$7(r, 'copy') && ((e = r.copy), !R$6(e)))
      throw new TypeError(
        'invalid option. `copy` option must be a boolean primitive. Option: `' + e + '`.'
      );
  }
  return (n = k$e(t)), e ? z$8(n) : q$b(n);
}
const C$9 = o$1b;
const D$9 = T$5;
const G$8 = B$9;
C$9(D$9, 'factory', G$8);
const k$d = I$c;
const z$7 = a$1Z;
function V$4(t) {
  return (
    'object' === typeof t &&
    null !== t &&
    'number' === typeof t.length &&
    z$7(t.length) &&
    t.length >= 0 &&
    t.length < k$d
  );
}
const A$8 = 'safe';
const B$8 = !0;
const D$8 = !1;
const M$5 = 'float64';
const N$c = !0;
const P$5 = 'throw';
const R$5 = 0;
const x$e = 'row-major';
const C$8 = {
  casting: A$8,
  codegen: B$8,
  copy: D$8,
  dtype: M$5,
  flatten: N$c,
  mode: P$5,
  ndmin: R$5,
  order: x$e,
};
const F$8 = k$h;
const q$a = d$j;
function G$7(t, r, e) {
  let n;
  let $;
  let i;
  if (((n = F$8(e)), 'generic' === e)) for ($ = [], i = 0; i < r; i++) $.push(t[i]);
  else if ('binary' === e) for ($ = q$a(r), i = 0; i < r; i++) $[i] = t[i];
  else for ($ = new n(r), i = 0; i < r; i++) $[i] = t[i];
  return $;
}
const H$9 = k$h;
const I$7 = d$j;
function J$7(t, r) {
  let e;
  let n;
  let $;
  let i;
  if (((e = H$9(r)), (n = t.length), 'generic' === r))
    for ($ = [], i = 0; i < n; i++) $.push(t.get(i));
  else if ('binary' === r) for ($ = I$7(n), i = 0; i < n; i++) $[i] = t.get(i);
  else for ($ = new e(n), i = 0; i < n; i++) $[i] = t.get(i);
  return $;
}
function K$6(t, r, e) {
  let n;
  let $;
  for (n = [], $ = 0; $ < e - t; $++) n.push(1);
  for ($ = 0; $ < t; $++) n.push(r[$]);
  return n;
}
const L$6 = t$U;
function Q$5(t, r, e, n) {
  let $;
  let i;
  let o;
  let a;
  let u;
  if (((u = t - (i = e.length)), ($ = []), 'row-major' === n)) {
    for (o = L$6(e[0]) * r[u], a = 0; a < u; a++) $.push(o);
    for (a = 0; a < i; a++) $.push(e[a]);
  } else {
    for (a = 0; a < u; a++) $.push(1);
    for (a = 0; a < i; a++) $.push(e[a]);
  }
  return $;
}
const S$5 = e$1e;
const U$5 = j$v;
const W$5 = y$k.isPrimitive;
const X$5 = e$1c;
const Y$5 = m$S.isPrimitive;
const Z$5 = e$18;
const $$5 = t$W;
const _$5 = t$V;
const ee = a$1P;
const re = t$T;
const oe = ctor$1;
const te = w$h;
const ie = o$T;
const ne = n$1a;
const ae = a$1z;
const se = f$K;
const pe = a$R;
const fe = z$9;
const me = u$B;
const de = D$9;
const le = V$4;
const ue = C$8;
const ce = G$7;
const he = J$7;
const ge = K$6;
const ye = Q$5;
function be() {
  let t;
  let r;
  let e;
  let n;
  let $;
  let i;
  let o;
  let a;
  let u;
  let f;
  let s;
  let c;
  let l;
  if (1 === arguments.length)
    if (le(arguments[0])) (e = arguments[0]), (t = {});
    else {
      if (!U$5((t = arguments[0])))
        throw new TypeError(
          'invalid argument. Must provide either a valid data source, options argument, or both. Value: `' +
            t +
            '`.'
        );
      if (S$5(t, 'buffer') && ((e = t.buffer), !le(e)))
        throw new TypeError(
          'invalid option. `buffer` option must be an array-like object, typed-array-like, a Buffer, or an ndarray. Option: `' +
            e +
            '`.'
        );
    }
  else {
    if (!le((e = arguments[0])))
      throw new TypeError(
        'invalid option. Data source must be an array-like object, typed-array-like, a Buffer, or an ndarray. Value: `' +
          e +
          '`.'
      );
    if (!U$5((t = arguments[1])))
      throw new TypeError(
        'invalid argument. Options argument must be an object. Value: `' + t + '`.'
      );
  }
  if (
    (e && (Z$5(e) ? ((o = e.dtype), (l = !0)) : ((o = fe(e)), (l = !1))),
    (f = {}),
    (s = {}),
    S$5(t, 'casting'))
  ) {
    if (((s.casting = t.casting), !ae(s.casting)))
      throw new TypeError(
        'invalid option. `casting` option must be a recognized casting mode. Option: `' +
          s.casting +
          '`.'
      );
  } else s.casting = ue.casting;
  if (S$5(t, 'flatten')) {
    if (((s.flatten = t.flatten), !W$5(s.flatten)))
      throw new TypeError(
        'invalid option. `flatten` option must be a boolean. Option: `' + s.flatten + '`.'
      );
  } else s.flatten = ue.flatten;
  if (S$5(t, 'ndmin')) {
    if (((s.ndmin = t.ndmin), !Y$5(s.ndmin)))
      throw new TypeError(
        'invalid option. `ndmin` option must be a nonnegative integer. Option: `' + s.ndmin + '`.'
      );
  } else s.ndmin = ue.ndmin;
  if (S$5(t, 'dtype')) {
    if (((i = t.dtype), !ie(i)))
      throw new TypeError(
        'invalid option. `dtype` option must be a recognized data type. Option: `' + i + '`.'
      );
    if (o && !se(o, i, s.casting))
      throw new Error(
        'invalid option. Data type cast is not allowed. Casting mode: `' +
          s.casting +
          '`. From: `' +
          o +
          '`. To: `' +
          i +
          '`.'
      );
  } else i = o && (l || 'generic' !== o) ? o : ue.dtype;
  if (S$5(t, 'order')) {
    if ('any' === ($ = t.order) || 'same' === $)
      l
        ? 'any' === $
          ? ($ = 'both' === ee(e.strides) ? ue.order : e.order)
          : 'same' === $ && ($ = e.order)
        : ($ = ue.order);
    else if (!ne($))
      throw new TypeError(
        'invalid option. `order` option must be a recognized order. Option: `' + $ + '`.'
      );
  } else $ = ue.order;
  if (
    (S$5(t, 'codegen') ? (f.codegen = t.codegen) : (f.codegen = ue.codegen),
    S$5(t, 'mode') ? (f.mode = t.mode) : (f.mode = ue.mode),
    S$5(t, 'submode') ? (f.submode = t.submode) : (f.submode = [f.mode]),
    S$5(t, 'copy'))
  ) {
    if (((s.copy = t.copy), !W$5(s.copy)))
      throw new TypeError(
        'invalid option. `copy` option must be a boolean. Option: `' + s.copy + '`.'
      );
  } else s.copy = ue.copy;
  if (S$5(t, 'shape')) {
    if (((a = t.shape), !le(a)))
      throw new TypeError(
        'invalid option. `shape` option must be an array-like object containing nonnegative integers. Option: `' +
          a +
          '`.'
      );
    (u = a.length), (c = re(a));
  } else {
    if (!e)
      throw new Error(
        'invalid arguments. Must provide either a data source, array shape, or both.'
      );
    l
      ? ((a = e.shape), (u = e.ndims), (c = e.length))
      : s.flatten && X$5(e)
      ? ((u = (a = me(e)).length), (c = re(a)))
      : ((u = 1), (a = [(c = e.length)]));
  }
  if ((u < s.ndmin && ((a = ge(u, a, s.ndmin)), (u = s.ndmin)), l)) {
    if (e.length !== c)
      throw new RangeError(
        'invalid arguments. Array shape is incompatible with provided data source. Number of data source elements does not match array shape.'
      );
    o !== i || s.copy
      ? (e = he(e, i))
      : ((r = e.strides), (n = e.offset), (e = e.data), r.length < u && (r = ye(u, a, r, $)));
  } else if (e) {
    if (('generic' === o && s.flatten && (e = de(e)), e.length !== c))
      throw new RangeError(
        'invalid arguments. Array shape is incompatible with provided data source. Number of data source elements does not match array shape.'
      );
    (o !== i || s.copy) && (e = ce(e, c, i));
  } else e = pe(i, c);
  return (
    void 0 === r && ((r = $$5(a, $)), (n = _$5(a, r))),
    f.submode.length < 3 ? new (te(i, u, f))(e, a, r, n, $) : new (oe(i, u, f))(e, a, r, n, $)
  );
}
const we = be;
const n$m = t$17;
function r$9(t) {
  return 0 === t && 1 / t === n$m;
}
const a$L = r$9;
const e$r = t$A;
const a$K = a$L;
function n$l() {
  let t;
  return function (r) {
    return 0 === arguments.length
      ? void 0 === t
        ? null
        : t
      : ((void 0 === t || r < t || e$r(r) || (r === t && a$K(r))) && (t = r), t);
  };
}
const i$r = n$l;
const n$k = t$U;
function a$J(t, r, e) {
  let n;
  let $;
  let i;
  let o;
  let a;
  let u;
  if (t <= 0) return 0;
  if (1 === t || 0 === e) return r[0];
  for ($ = e < 0 ? (1 - t) * e : 0, n = 0, a = 0, u = 0; u < t; u++)
    (o = n + (i = r[$])), n$k(n) >= n$k(i) ? (a += n - o + i) : (a += i - o + n), (n = o), ($ += e);
  return n + a;
}
const t$b = t$U;
function f$r(t, r, e, n) {
  let $;
  let i;
  let o;
  let a;
  let u;
  let f;
  if (t <= 0) return 0;
  if (1 === t || 0 === e) return r[n];
  for (i = n, $ = 0, u = 0, f = 0; f < t; f++)
    (a = $ + (o = r[i])), t$b($) >= t$b(o) ? (u += $ - a + o) : (u += o - a + $), ($ = a), (i += e);
  return $ + u;
}
const o$f = o$1b;
const i$q = a$J;
const u$w = f$r;
o$f(i$q, 'ndarray', u$w);
const m$s = i$q;
const a$I = m$s;
function e$q(t, r, e) {
  return a$I(t, r, e);
}
const o$e = m$s.ndarray;
function t$a(t, r, e, n) {
  return o$e(t, r, e, n);
}
const u$v = o$1b;
const f$q = e$q;
const i$p = t$a;
u$v(f$q, 'ndarray', i$p);
const m$r = f$q;
const a$H = a$L;
const s$n = t$A;
const f$p = t$17;
const i$o = I$c;
function e$p(t, r) {
  let e;
  let n;
  let $;
  let i;
  if (2 === (e = arguments.length))
    return s$n(t) || s$n(r)
      ? NaN
      : t === f$p || r === f$p
      ? f$p
      : t === r && 0 === t
      ? a$H(t)
        ? t
        : r
      : t < r
      ? t
      : r;
  for (n = i$o, i = 0; i < e; i++) {
    if (s$n(($ = arguments[i])) || $ === f$p) return $;
    ($ < n || ($ === n && 0 === $ && a$H($))) && (n = $);
  }
  return n;
}
const m$q = e$p;
const o$d = I$c;
const a$G = t$17;
function r$8(t) {
  return t === o$d || t === a$G;
}
const f$o = r$8;
const u$u = p$r;
const i$n = p$t;
const a$F = { uint16: i$n, uint8: u$u };
const e$o = a$F;
function f$n() {
  let t;
  return ((t = new e$o.uint16(1))[0] = 4660), 52 === new e$o.uint8(t.buffer)[0];
}
const o$c = f$n();
const m$p = o$c;
const o$b = m$p;
const f$m = !0 === o$b ? 1 : 0;
const i$m = p$s;
const n$j = f$H;
const m$o = f$m;
const s$m = new n$j(1);
const u$t = new i$m(s$m.buffer);
function l$m(t) {
  return (s$m[0] = t), u$t[m$o];
}
const p$l = l$m;
const o$a = m$p;
const f$l = !0 === o$a ? 1 : 0;
const i$l = p$s;
const n$i = f$H;
const m$n = f$l;
const s$l = new n$i(1);
const u$s = new i$l(s$l.buffer);
function l$l(t, r) {
  return (s$l[0] = t), (u$s[m$n] = r >>> 0), s$l[0];
}
const p$k = l$l;
const a$E = 1023;
function s$k(t) {
  return 0 === t
    ? 0.3999999999940942
    : 0.3999999999940942 + t * (0.22222198432149784 + 0.15313837699209373 * t);
}
function e$n(t) {
  return 0 === t
    ? 0.6666666666666735
    : 0.6666666666666735 +
        t * (0.2857142874366239 + t * (0.1818357216161805 + 0.14798198605116586 * t));
}
const f$k = p$l;
const m$m = p$k;
const i$k = t$A;
const u$r = a$E;
const p$j = t$17;
const h$e = s$k;
const b$c = e$n;
const c$h = 0.6931471803691238;
const j$h = 1.9082149292705877e-10;
const l$k = 0x40000000000000;
const d$f = 0.3333333333333333;
const g$c = 1048575;
const v$g = 2146435072;
const x$d = 1048576;
const w$b = 1072693248;
function N$b(t) {
  let r;
  let e;
  let n;
  let $;
  let i;
  let o;
  let a;
  let u;
  let f;
  let s;
  let c;
  return 0 === t
    ? p$j
    : i$k(t) || t < 0
    ? NaN
    : (($ = 0),
      (e = f$k(t)) < x$d && (($ -= 54), (e = f$k((t *= l$k)))),
      e >= v$g
        ? t + t
        : (($ += ((e >> 20) - u$r) | 0),
          ($ += ((a = ((614244 + (e &= g$c)) & 1048576) | 0) >> 20) | 0),
          (o = (t = m$m(t, e | (a ^ w$b))) - 1),
          (g$c & (2 + e)) < 3
            ? 0 === o
              ? 0 === $
                ? 0
                : $ * c$h + $ * j$h
              : ((i = o * o * (0.5 - d$f * o)), 0 === $ ? o - i : $ * c$h - (i - $ * j$h - o))
            : ((a = (e - 398458) | 0),
              (u = (440401 - e) | 0),
              (n = (s = (c = (f = o / (2 + o)) * f) * c) * h$e(s)),
              (i = c * b$c(s) + n),
              (a |= u) > 0
                ? ((r = 0.5 * o * o),
                  0 === $ ? o - (r - f * (r + i)) : $ * c$h - (r - (f * (r + i) + $ * j$h) - o))
                : 0 === $
                ? o - f * (o - i)
                : $ * c$h - (f * (o - i) - $ * j$h - o))));
}
const k$c = N$b;
const a$D = Math.ceil;
const e$m = a$D;
const t$9 = o$19;
const f$j = e$m;
function e$l(t) {
  return t < 0 ? f$j(t) : t$9(t);
}
const i$j = e$l;
function e$k(t) {
  return 0 === t
    ? 0.0416666666666666
    : 0.0416666666666666 + t * (2480158728947673e-20 * t - 0.001388888888887411);
}
function r$7(t) {
  return 0 === t
    ? -2.7557314351390663e-7
    : t * (2.087572321298175e-9 + -11359647557788195e-27 * t) - 2.7557314351390663e-7;
}
const n$h = e$k;
const t$8 = r$7;
function u$q(t, r) {
  let e;
  let n;
  let $;
  let i;
  return (
    ($ = (i = t * t) * i),
    (n = i * n$h(i)),
    (n += $ * $ * t$8(i)),
    ($ = 1 - (e = 0.5 * i)) + (1 - $ - e + (i * n - t * r))
  );
}
const a$C = u$q;
const e$j = -0.16666666666666632;
const r$6 = 0.00833333333332249;
const a$B = -0.0001984126982985795;
const t$7 = 27557313707070068e-22;
const n$g = -2.5050760253406863e-8;
const u$p = 1.58969099521155e-10;
function v$f(t, r) {
  let e;
  let n;
  let $;
  return (
    (e = r$6 + ($ = t * t) * (a$B + $ * t$7) + $ * ($ * $) * (n$g + $ * u$p)),
    (n = $ * t),
    0 === r ? t + n * (e$j + $ * e) : t - ($ * (0.5 * r - n * e) - r - n * e$j)
  );
}
const f$i = v$f;
const o$9 = m$p;
const f$h = !0 === o$9 ? 0 : 1;
const i$i = p$s;
const n$f = f$H;
const m$l = f$h;
const s$j = new n$f(1);
const u$o = new i$i(s$j.buffer);
function l$j(t) {
  return (s$j[0] = t), u$o[m$l];
}
const p$i = l$j;
let o$8;
let f$g;
const i$h = m$p;
!0 === i$h ? ((o$8 = 1), (f$g = 0)) : ((o$8 = 0), (f$g = 1));
const n$e = { HIGH: o$8, LOW: f$g };
const m$k = p$s;
const s$i = f$H;
const u$n = n$e;
const l$i = new s$i(1);
const p$h = new m$k(l$i.buffer);
const H$8 = u$n.HIGH;
const j$g = u$n.LOW;
function v$e(t, r) {
  return (p$h[H$8] = t), (p$h[j$g] = r), l$i[0];
}
const d$e = v$e;
const a$A = 1023;
const a$z = -1023;
const a$y = -1074;
let e$i;
let o$7;
const f$f = m$p;
!0 === f$f ? ((e$i = 1), (o$7 = 0)) : ((e$i = 0), (o$7 = 1));
const i$g = { HIGH: e$i, LOW: o$7 };
const u$m = p$s;
const m$j = f$H;
const s$h = i$g;
const l$h = new m$j(1);
const p$g = new u$m(l$h.buffer);
const v$d = s$h.HIGH;
const H$7 = s$h.LOW;
function j$f(t, r) {
  return (l$h[0] = r), (t[0] = p$g[v$d]), (t[1] = p$g[H$7]), t;
}
const c$g = j$f;
function d$d(t, r) {
  return 1 === arguments.length ? c$g([0, 0], t) : c$g(t, r);
}
const w$a = d$d;
const a$x = w$a;
const e$h = p$l;
const m$i = d$e;
const f$e = 2147483648;
const s$g = 2147483647;
const b$b = [0, 0];
function n$d(t, r) {
  let e;
  let n;
  return a$x(b$b, t), (e = b$b[0]), (e &= s$g), (n = e$h(r)), m$i((e |= n &= f$e), b$b[1]);
}
const u$l = n$d;
const e$g = 22250738585072014e-324;
const m$h = e$g;
const n$c = f$o;
const o$6 = t$A;
const e$f = t$U;
const i$f = 4503599627370496;
function f$d(t, r) {
  return o$6(r) || n$c(r)
    ? ((t[0] = r), (t[1] = 0), t)
    : 0 !== r && e$f(r) < m$h
    ? ((t[0] = r * i$f), (t[1] = -52), t)
    : ((t[0] = r), (t[1] = 0), t);
}
const l$g = f$d;
function p$f(t, r) {
  return 1 === arguments.length ? l$g([0, 0], t) : l$g(t, r);
}
const h$d = p$f;
const a$w = 2146435072;
const a$v = p$l;
const n$b = a$w;
const m$g = a$E;
function s$f(t) {
  let r = a$v(t);
  return ((r = (r & n$b) >>> 20) - m$g) | 0;
}
const e$e = s$f;
const j$e = I$c;
const u$k = t$17;
const c$f = a$E;
const x$c = a$A;
const h$c = a$z;
const d$c = a$y;
const v$c = t$A;
const w$9 = f$o;
const g$b = u$l;
const y$8 = h$d;
const z$6 = e$e;
const k$b = w$a;
const q$9 = d$e;
const A$7 = 2220446049250313e-31;
const B$7 = 2148532223;
const C$7 = [0, 0];
const D$7 = [0, 0];
function E$7(t, r) {
  let e;
  let n;
  return 0 === t || v$c(t) || w$9(t)
    ? t
    : (y$8(C$7, t),
      (t = C$7[0]),
      (r += C$7[1]),
      (r += z$6(t)) < d$c
        ? g$b(0, t)
        : r > x$c
        ? t < 0
          ? u$k
          : j$e
        : (r <= h$c ? ((r += 52), (n = A$7)) : (n = 1),
          k$b(D$7, t),
          (e = D$7[0]),
          (e &= B$7),
          n * q$9((e |= (r + c$f) << 20), D$7[1])));
}
const F$7 = E$7;
const a$u = Math.round;
const r$5 = a$u;
const a$t = o$19;
const i$e = F$7;
const u$j = [
  10680707, 7228996, 1387004, 2578385, 16069853, 12639074, 9804092, 4427841, 16666979, 11263675,
  12935607, 2387514, 4345298, 14681673, 3074569, 13734428, 16653803, 1880361, 10960616, 8533493,
  3062596, 8710556, 7349940, 6258241, 3772886, 3769171, 3798172, 8675211, 12450088, 3874808,
  9961438, 366607, 15675153, 9132554, 7151469, 3571407, 2607881, 12013382, 4155038, 6285869,
  7677882, 13102053, 15825725, 473591, 9065106, 15363067, 6271263, 9264392, 5636912, 4652155,
  7056368, 13614112, 10155062, 1944035, 9527646, 15080200, 6658437, 6231200, 6832269, 16767104,
  5075751, 3212806, 1398474, 7579849, 6349435, 12618859,
];
const m$f = [
  1.570796251296997, 7.549789415861596e-8, 5390302529957765e-30, 3282003415807913e-37,
  1270655753080676e-44, 12293330898111133e-52, 27337005381646456e-60, 21674168387780482e-67,
];
const s$e = 16777216;
const w$8 = 5.960464477539063e-8;
const l$f = b$a(new Array(20));
const v$b = b$a(new Array(20));
const c$e = b$a(new Array(20));
const p$e = b$a(new Array(20));
function b$a(t) {
  let r;
  const e = t.length;
  for (r = 0; r < e; r++) t[r] = 0;
  return t;
}
function d$b(t, r, e, n, $, i, o, a, u) {
  let f;
  let s;
  let c;
  let l;
  let p;
  let h;
  let g;
  let d;
  let v;
  for (l = i, v = n[e], d = e, p = 0; d > 0; p++)
    (s = (w$8 * v) | 0), (p$e[p] = (v - s$e * s) | 0), (v = n[d - 1] + s), (d -= 1);
  if (
    ((v = i$e(v, $)),
    (v -= 8 * a$t(0.125 * v)),
    (v -= g = 0 | v),
    (c = 0),
    $ > 0
      ? ((g += p = p$e[e - 1] >> (24 - $)),
        (p$e[e - 1] -= p << (24 - $)),
        (c = p$e[e - 1] >> (23 - $)))
      : 0 === $
      ? (c = p$e[e - 1] >> 23)
      : v >= 0.5 && (c = 2),
    c > 0)
  ) {
    for (g += 1, f = 0, p = 0; p < e; p++)
      (d = p$e[p]),
        0 === f ? 0 !== d && ((f = 1), (p$e[p] = 16777216 - d)) : (p$e[p] = 16777215 - d);
    if ($ > 0)
      switch ($) {
        case 1:
          p$e[e - 1] &= 8388607;
          break;
        case 2:
          p$e[e - 1] &= 4194303;
      }
    2 === c && ((v = 1 - v), 0 !== f && (v -= i$e(1, $)));
  }
  if (0 === v) {
    for (d = 0, p = e - 1; p >= i; p--) d |= p$e[p];
    if (0 === d) {
      for (h = 1; 0 === p$e[i - h]; h++);
      for (p = e + 1; p <= e + h; p++) {
        for (u[a + p] = u$j[o + p], s = 0, d = 0; d <= a; d++) s += t[d] * u[a + (p - d)];
        n[p] = s;
      }
      return d$b(t, r, (e += h), n, $, i, o, a, u);
    }
  }
  if (0 === v) for (e -= 1, $ -= 24; 0 === p$e[e]; ) (e -= 1), ($ -= 24);
  else
    (v = i$e(v, -$)) >= s$e
      ? ((s = (w$8 * v) | 0), (p$e[e] = (v - s$e * s) | 0), ($ += 24), (p$e[(e += 1)] = s))
      : (p$e[e] = 0 | v);
  for (s = i$e(1, $), p = e; p >= 0; p--) (n[p] = s * p$e[p]), (s *= w$8);
  for (p = e; p >= 0; p--) {
    for (s = 0, h = 0; h <= l && h <= e - p; h++) s += m$f[h] * n[p + h];
    c$e[e - p] = s;
  }
  for (s = 0, p = e; p >= 0; p--) s += c$e[p];
  for (r[0] = 0 === c ? s : -s, s = c$e[0] - s, p = 1; p <= e; p++) s += c$e[p];
  return (r[1] = 0 === c ? s : -s), 7 & g;
}
function j$d(t, r, e, n) {
  let $;
  let i;
  let o;
  let a;
  let u;
  let f;
  let s;
  for (
    (i = ((e - 3) / 24) | 0) < 0 && (i = 0),
      a = e - 24 * (i + 1),
      f = i - (o = n - 1),
      s = o + 4,
      u = 0;
    u <= s;
    u++
  )
    (l$f[u] = f < 0 ? 0 : u$j[f]), (f += 1);
  for (u = 0; u <= 4; u++) {
    for ($ = 0, f = 0; f <= o; f++) $ += t[f] * l$f[o + (u - f)];
    v$b[u] = $;
  }
  return d$b(t, r, 4, v$b, a, 4, i, o, l$f);
}
const y$7 = r$5;
const A$6 = p$l;
const g$a = 0.6366197723675814;
const h$b = 1.5707963267341256;
const N$a = 6077100506506192e-26;
const x$b = 6077100506303966e-26;
const k$a = 20222662487959506e-37;
const q$8 = 20222662487111665e-37;
const z$5 = 84784276603689e-45;
const B$6 = 2047;
function C$6(t, r, e) {
  let n;
  let $;
  let i;
  let o;
  let a;
  return (
    (i = t - (n = y$7(t * g$a)) * h$b),
    (o = n * N$a),
    (a = (r >> 20) | 0),
    (e[0] = i - o),
    a - ((A$6(e[0]) >> 20) & B$6) > 16 &&
      ((o = n * k$a - (($ = i) - (i = $ - (o = n * x$b)) - o)),
      (e[0] = i - o),
      a - ((A$6(e[0]) >> 20) & B$6) > 49 &&
        ((o = n * z$5 - (($ = i) - (i = $ - (o = n * q$8)) - o)), (e[0] = i - o))),
    (e[1] = i - e[0] - o),
    n
  );
}
const D$6 = p$l;
const E$6 = p$i;
const F$6 = d$e;
const G$6 = j$d;
const H$6 = C$6;
const I$6 = 0;
const J$6 = 16777216;
const K$5 = 1.5707963267341256;
const L$5 = 6077100506506192e-26;
const M$4 = 2 * L$5;
const O$4 = 3 * L$5;
const P$4 = 4 * L$5;
const Q$4 = 2147483647;
const R$4 = 2146435072;
const S$4 = 1048575;
const T$4 = 598523;
const U$4 = 1072243195;
const V$3 = 1073928572;
const W$4 = 1074752122;
const X$4 = 1074977148;
const Y$4 = 1075183036;
const Z$4 = 1075388923;
const $$4 = 1075594811;
const _$4 = 1094263291;
const rr$4 = new Array(3);
const er$3 = new Array(2);
function or$2(t, r) {
  let e;
  let n;
  let $;
  let i;
  let o;
  let a;
  let u;
  if (($ = (D$6(t) & Q$4) | 0) <= U$4) return (r[0] = t), (r[1] = 0), 0;
  if ($ <= W$4)
    return ($ & S$4) === T$4
      ? H$6(t, $, r)
      : $ <= V$3
      ? t > 0
        ? ((u = t - K$5), (r[0] = u - L$5), (r[1] = u - r[0] - L$5), 1)
        : ((u = t + K$5), (r[0] = u + L$5), (r[1] = u - r[0] + L$5), -1)
      : t > 0
      ? ((u = t - 2 * K$5), (r[0] = u - M$4), (r[1] = u - r[0] - M$4), 2)
      : ((u = t + 2 * K$5), (r[0] = u + M$4), (r[1] = u - r[0] + M$4), -2);
  if ($ <= $$4)
    return $ <= Y$4
      ? $ === X$4
        ? H$6(t, $, r)
        : t > 0
        ? ((u = t - 3 * K$5), (r[0] = u - O$4), (r[1] = u - r[0] - O$4), 3)
        : ((u = t + 3 * K$5), (r[0] = u + O$4), (r[1] = u - r[0] + O$4), -3)
      : $ === Z$4
      ? H$6(t, $, r)
      : t > 0
      ? ((u = t - 4 * K$5), (r[0] = u - P$4), (r[1] = u - r[0] - P$4), 4)
      : ((u = t + 4 * K$5), (r[0] = u + P$4), (r[1] = u - r[0] + P$4), -4);
  if ($ < _$4) return H$6(t, $, r);
  if ($ >= R$4) return (r[0] = NaN), (r[1] = NaN), 0;
  for (e = E$6(t), u = F$6($ - (((n = ($ >> 20) - 1046) << 20) | 0), e), o = 0; o < 2; o++)
    (rr$4[o] = 0 | u), (u = (u - rr$4[o]) * J$6);
  for (rr$4[2] = u, i = 3; rr$4[i - 1] === I$6; ) i -= 1;
  return (
    (a = G$6(rr$4, er$3, n, i)),
    t < 0 ? ((r[0] = -er$3[0]), (r[1] = -er$3[1]), -a) : ((r[0] = er$3[0]), (r[1] = er$3[1]), a)
  );
}
const fr$2 = or$2;
const n$a = p$l;
const a$s = a$C;
const i$d = f$i;
const s$d = fr$2;
const f$c = [0, 0];
const m$e = 2147483647;
const u$i = 1072243195;
const c$d = 1044381696;
const p$d = 2146435072;
function l$e(t) {
  let r;
  if (((r = n$a(t)), (r &= m$e) <= u$i)) return r < c$d ? 1 : a$s(t, 0);
  if (r >= p$d) return NaN;
  switch (3 & s$d(t, f$c)) {
    case 0:
      return a$s(f$c[0], f$c[1]);
    case 1:
      return -i$d(f$c[0], f$c[1]);
    case 2:
      return -a$s(f$c[0], f$c[1]);
    default:
      return i$d(f$c[0], f$c[1]);
  }
}
const j$c = l$e;
const n$9 = p$l;
const a$r = a$C;
const i$c = f$i;
const s$c = fr$2;
const f$b = 2147483647;
const m$d = 2146435072;
const u$h = 1072243195;
const c$c = 1045430272;
const p$c = [0, 0];
function l$d(t) {
  let r;
  if (((r = n$9(t)), (r &= f$b) <= u$h)) return r < c$c ? t : i$c(t, 0);
  if (r >= m$d) return NaN;
  switch (3 & s$c(t, p$c)) {
    case 0:
      return i$c(p$c[0], p$c[1]);
    case 1:
      return a$r(p$c[0], p$c[1]);
    case 2:
      return -i$c(p$c[0], p$c[1]);
    default:
      return -a$r(p$c[0], p$c[1]);
  }
}
const j$b = l$d;
const a$q = 3.141592653589793;
const f$a = t$A;
const n$8 = f$o;
const p$b = j$c;
const j$a = j$b;
const e$d = t$U;
const c$b = u$l;
const u$g = a$q;
function v$a(t) {
  let r;
  let e;
  return f$a(t) || n$8(t)
    ? NaN
    : 0 === (r = e$d((e = t % 2))) || 1 === r
    ? c$b(0, e)
    : r < 0.25
    ? j$a(u$g * e)
    : r < 0.75
    ? c$b(p$b(u$g * (r = 0.5 - r)), e)
    : r < 1.25
    ? ((e = c$b(1, e) - e), j$a(u$g * e))
    : r < 1.75
    ? -c$b(p$b(u$g * (r -= 1.5)), e)
    : ((e -= c$b(2, e)), j$a(u$g * e));
}
const l$c = v$a;
function u$f(t) {
  return 0 === t
    ? 0.06735230105312927
    : 0.06735230105312927 +
        t *
          (0.007385550860814029 +
            t * (0.0011927076318336207 + t * (0.00022086279071390839 + 25214456545125733e-21 * t)));
}
function a$p(t) {
  return 0 === t
    ? 0.020580808432516733
    : 0.020580808432516733 +
        t *
          (0.0028905138367341563 +
            t * (0.0005100697921535113 + t * (0.00010801156724758394 + 44864094961891516e-21 * t)));
}
function c$a(t) {
  return 0 === t
    ? 1.3920053346762105
    : 1.3920053346762105 +
        t *
          (0.7219355475671381 +
            t *
              (0.17193386563280308 +
                t *
                  (0.01864591917156529 + t * (0.0007779424963818936 + 7326684307446256e-21 * t))));
}
function m$c(t) {
  return 0 === t
    ? 0.21498241596060885
    : 0.21498241596060885 +
        t *
          (0.325778796408931 +
            t *
              (0.14635047265246445 +
                t *
                  (0.02664227030336386 + t * (0.0018402845140733772 + 3194753265841009e-20 * t))));
}
function p$a(t) {
  return 0 === t
    ? -0.032788541075985965
    : t * (0.006100538702462913 + t * (0.00031563207090362595 * t - 0.0014034646998923284)) -
        0.032788541075985965;
}
function j$9(t) {
  return 0 === t
    ? 0.01797067508118204
    : 0.01797067508118204 +
        t * (t * (0.000881081882437654 + -0.00031275416837512086 * t) - 0.0036845201678113826);
}
function l$b(t) {
  return 0 === t
    ? -0.010314224129834144
    : t * (0.0022596478090061247 + t * (0.0003355291926355191 * t - 0.0005385953053567405)) -
        0.010314224129834144;
}
function h$a(t) {
  return 0 === t
    ? 0.6328270640250934
    : 0.6328270640250934 +
        t *
          (1.4549225013723477 +
            t * (0.9777175279633727 + t * (0.22896372806469245 + 0.013381091853678766 * t)));
}
function b$9(t) {
  return 0 === t
    ? 2.4559779371304113
    : 2.4559779371304113 +
        t *
          (2.128489763798934 +
            t * (0.7692851504566728 + t * (0.10422264559336913 + 0.003217092422824239 * t)));
}
function v$9(t) {
  return 0 === t
    ? 0.08333333333333297
    : 0.08333333333333297 +
        t *
          (t *
            (0.0007936505586430196 +
              t *
                (t * (0.0008363399189962821 + -0.0016309293409657527 * t) - 0.00059518755745034)) -
            0.0027777777772877554);
}
const k$9 = t$A;
const w$7 = f$o;
const x$a = t$U;
const d$a = k$c;
const g$9 = i$j;
const q$7 = l$c;
const y$6 = a$q;
const z$4 = I$c;
const A$5 = u$f;
const B$5 = a$p;
const C$5 = c$a;
const D$5 = m$c;
const E$5 = p$a;
const F$5 = j$9;
const G$5 = l$b;
const H$5 = h$a;
const I$5 = b$9;
const J$5 = v$9;
const K$4 = 0.07721566490153287;
const L$4 = 0.3224670334241136;
const M$3 = 1;
const N$9 = -0.07721566490153287;
const O$3 = 0.48383612272381005;
const P$3 = -0.1475877229945939;
const Q$3 = 0.06462494023913339;
const R$3 = -0.07721566490153287;
const S$3 = 1;
const T$3 = 0.4189385332046727;
const U$3 = 1.4616321449683622;
const V$2 = 4503599627370496;
const W$3 = 0x400000000000000;
const X$3 = 8470329472543003e-37;
const Y$3 = 1.4616321449683622;
const Z$3 = -0.12148629053584961;
const $$3 = -3638676997039505e-33;
function _$3(t) {
  let r;
  let e;
  let n;
  let $;
  let i;
  let o;
  let a;
  let u;
  let f;
  let s;
  let c;
  if (k$9(t) || w$7(t)) return t;
  if (0 === t) return z$4;
  if ((t < 0 ? ((r = !0), (t = -t)) : (r = !1), t < X$3)) return -d$a(t);
  if (r) {
    if (t >= V$2) return z$4;
    if (0 === (a = q$7(t))) return z$4;
    e = d$a(y$6 / x$a(a * t));
  }
  if (1 === t || 2 === t) return 0;
  if (t < 2)
    switch (
      (t <= 0.9
        ? ((c = -d$a(t)),
          t >= U$3 - 1 + 0.27
            ? ((f = 1 - t), (n = 0))
            : t >= U$3 - 1 - 0.27
            ? ((f = t - (Y$3 - 1)), (n = 1))
            : ((f = t), (n = 2)))
        : ((c = 0),
          t >= U$3 + 0.27
            ? ((f = 2 - t), (n = 0))
            : t >= U$3 - 0.27
            ? ((f = t - Y$3), (n = 1))
            : ((f = t - 1), (n = 2))),
      n)
    ) {
      case 0:
        c += f * (o = K$4 + (s = f * f) * A$5(s)) + (i = s * (L$4 + s * B$5(s))) - 0.5 * f;
        break;
      case 1:
        (o = O$3 + (u = (s = f * f) * f) * E$5(u)),
          (i = P$3 + u * F$5(u)),
          ($ = Q$3 + u * G$5(u)),
          (c += Z$3 + (s * o - ($$3 - u * (i + f * $))));
        break;
      case 2:
        c += -0.5 * f + (o = f * (R$3 + f * H$5(f))) / (i = S$3 + f * I$5(f));
    }
  else if (t < 8)
    switch (
      ((c = 0.5 * (f = t - (n = g$9(t))) + (f * (N$9 + f * D$5(f))) / (M$3 + f * C$5(f))),
      (s = 1),
      n)
    ) {
      case 7:
        s *= f + 6;
      case 6:
        s *= f + 5;
      case 5:
        s *= f + 4;
      case 4:
        s *= f + 3;
      case 3:
        c += d$a((s *= f + 2));
    }
  else
    c =
      t < W$3
        ? (t - 0.5) * ((a = d$a(t)) - 1) + (u = T$3 + (s = 1 / t) * J$5((f = s * s)))
        : t * (d$a(t) - 1);
  return r && (c = e - c), c;
}
const rr$3 = _$3;
const a$o = 2.5066282746310007;
const t$6 = a$1Z;
function e$c(t) {
  return t$6(t / 2);
}
const i$b = e$c;
const e$b = i$b;
function t$5(t) {
  return e$b(t > 0 ? t - 1 : t + 1);
}
const n$7 = t$5;
const t$4 = Math.sqrt;
const a$n = t$4;
const o$5 = m$p;
const f$9 = !0 === o$5 ? 0 : 1;
const i$a = p$s;
const n$6 = f$H;
const m$b = f$9;
const s$b = new n$6(1);
const u$e = new i$a(s$b.buffer);
function l$a(t, r) {
  return (s$b[0] = t), (u$e[m$b] = r >>> 0), s$b[0];
}
const p$9 = l$a;
function r$4(t) {
  return 0 | t;
}
const t$3 = r$4;
const a$m = 0.6931471805599453;
const d$9 = n$7;
const h$9 = u$l;
const w$6 = t$17;
const g$8 = I$c;
function x$9(t, r) {
  return r === w$6 ? g$8 : r === g$8 ? 0 : r > 0 ? (d$9(r) ? t : 0) : d$9(r) ? h$9(g$8, t) : g$8;
}
const N$8 = p$l;
const q$6 = 2147483647;
const y$5 = 1072693247;
const k$8 = 1e300;
const z$3 = 1e-300;
function A$4(t, r) {
  return (N$8(t) & q$6) <= y$5 ? (r < 0 ? k$8 * k$8 : z$3 * z$3) : r > 0 ? k$8 * k$8 : z$3 * z$3;
}
const B$4 = t$U;
const C$4 = I$c;
function D$4(t, r) {
  return -1 === t ? (t - t) / (t - t) : 1 === t ? 1 : B$4(t) < 1 == (r === C$4) ? 0 : C$4;
}
function E$4(t) {
  return 0 === t
    ? 0.5999999999999946
    : 0.5999999999999946 +
        t *
          (0.4285714285785502 +
            t *
              (0.33333332981837743 +
                t * (0.272728123808534 + t * (0.23066074577556175 + 0.20697501780033842 * t))));
}
const F$4 = p$l;
const G$4 = p$9;
const H$4 = p$k;
const I$4 = a$E;
const J$4 = E$4;
const K$3 = 1048575;
const L$3 = 1048576;
const M$2 = 1072693248;
const O$2 = 536870912;
const P$2 = 524288;
const Q$2 = 20;
const R$2 = 9007199254740992;
const S$2 = 0.9617966939259756;
const T$2 = 0.9617967009544373;
const U$2 = -7.028461650952758e-9;
const V$1 = [1, 1.5];
const W$2 = [0, 0.5849624872207642];
const X$2 = [0, 1.350039202129749e-8];
function Y$2(t, r, e) {
  let n;
  let $;
  let i;
  let o;
  let a;
  let u;
  let f;
  let s;
  let c;
  let l;
  let p;
  let h;
  let g;
  let d;
  let v;
  let y;
  let m;
  let b;
  let w;
  let E;
  return (
    (b = 0),
    e < L$3 && ((b -= 53), (e = F$4((r *= R$2)))),
    (b += ((e >> Q$2) - I$4) | 0),
    (e = (w = (e & K$3) | 0) | M$2 | 0),
    w <= 235662 ? (E = 0) : w < 767610 ? (E = 1) : ((E = 0), (b += 1), (e -= L$3)),
    (r = H$4(r, e)),
    (f = V$1[E]),
    (o = G$4(($ = (y = r - f) * (m = 1 / (r + f))), 0)),
    (n = ((e >> 1) | O$2) + P$2),
    (a = m * (y - o * (u = H$4(0, (n += E << 18))) - o * (r - (u - f)))),
    (v = (i = $ * $) * i * J$4(i)),
    (u = G$4((u = 3 + (i = o * o) + (v += a * (o + $))), 0)),
    (c = G$4((c = (y = o * u) + (m = a * u + (v - (u - 3 - i)) * $)), 0)),
    (l = T$2 * c),
    (p = U$2 * c + (m - (c - y)) * S$2 + X$2[E]),
    (s = W$2[E]),
    (g = p - ((h = G$4((h = l + p + s + (d = b)), 0)) - d - s - l)),
    (t[0] = h),
    (t[1] = g),
    t
  );
}
function Z$2(t) {
  return 0 === t ? 0.5 : 0.5 + t * (0.25 * t - 0.3333333333333333);
}
const $$2 = p$9;
const _$2 = Z$2;
const rr$2 = 1.4426950408889634;
const tr$2 = 1.4426950216293335;
const nr$2 = 1.9259629911266175e-8;
function er$2(t, r) {
  let e;
  let n;
  let $;
  let i;
  let o;
  let a;
  return (
    (i = ($ = r - 1) * $ * _$2($)),
    (e = (a = $ * nr$2 - i * rr$2) - ((n = $$2((n = (o = tr$2 * $) + a), 0)) - o)),
    (t[0] = n),
    (t[1] = e),
    t
  );
}
function ir$2(t) {
  return 0 === t
    ? 0.16666666666666602
    : 0.16666666666666602 +
        t *
          (t * (6613756321437934e-20 + t * (4.1381367970572385e-8 * t - 16533902205465252e-22)) -
            0.0027777777777015593);
}
const or$1 = p$l;
const fr$1 = p$k;
const sr$1 = p$9;
const ur$1 = t$3;
const mr$1 = F$7;
const ar$2 = a$m;
const pr$1 = a$E;
const jr$1 = ir$2;
const cr$1 = 2147483647;
const lr$1 = 1048575;
const br$1 = 1048576;
const vr$1 = 1071644672;
const dr$1 = 20;
const hr$1 = 0.6931471824645996;
const wr$1 = -1.904654299957768e-9;
function gr$1(t, r, e) {
  let n;
  let $;
  let i;
  let o;
  let a;
  let u;
  let f;
  let s;
  let c;
  return (
    (c = (((s = (t & cr$1) | 0) >> dr$1) - pr$1) | 0),
    (f = 0),
    s > vr$1 &&
      (($ = fr$1(
        0,
        ((f = (t + (br$1 >> (c + 1))) >>> 0) &
          ~(lr$1 >> (c = (((f & cr$1) >> dr$1) - pr$1) | 0))) >>>
          0
      )),
      (f = (((f & lr$1) | br$1) >> (dr$1 - c)) >>> 0),
      t < 0 && (f = -f),
      (r -= $)),
    (a =
      (o = (e - (($ = sr$1(($ = e + r), 0)) - r)) * ar$2 + $ * wr$1) -
      ((u = (i = $ * hr$1) + o) - i)),
    (n = u - ($ = u * u) * jr$1($)),
    (t = or$1((u = 1 - ((u * n) / (n - 2) - (a + u * a) - u)))),
    (t = ur$1(t)),
    (t += (f << dr$1) >>> 0) >> dr$1 <= 0 ? mr$1(u, f) : fr$1(u, t)
  );
}
const xr$1 = t$A;
const Nr$1 = n$7;
const qr$1 = f$o;
const yr$1 = a$1Z;
const kr$1 = a$n;
const zr$1 = t$U;
const Ar$1 = w$a;
const Br$1 = p$9;
const Cr$1 = t$3;
const Dr$1 = t$17;
const Er$1 = I$c;
const Fr$1 = x$9;
const Gr$1 = A$4;
const Hr$1 = D$4;
const Ir$1 = Y$2;
const Jr$1 = er$2;
const Kr$1 = gr$1;
const Lr$1 = 2147483647;
const Mr$1 = 1072693247;
const Or$1 = 1105199104;
const Pr$1 = 1139802112;
const Qr$1 = 1083179008;
const Rr$1 = 1072693248;
const Sr$1 = 1083231232;
const Tr$1 = 3230714880;
const Ur$1 = 31;
const Vr$1 = 1e300;
const Wr$1 = 1e-300;
const Xr$1 = 8008566259537294e-32;
const Yr$1 = [0, 0];
const Zr$1 = [0, 0];
function $r$1(t, r) {
  let e;
  let n;
  let $;
  let i;
  let o;
  let a;
  let u;
  let f;
  let s;
  let c;
  let l;
  let p;
  let h;
  let g;
  if (xr$1(t) || xr$1(r)) return NaN;
  if ((Ar$1(Yr$1, r), (o = Yr$1[0]), 0 === Yr$1[1])) {
    if (0 === r) return 1;
    if (1 === r) return t;
    if (-1 === r) return 1 / t;
    if (0.5 === r) return kr$1(t);
    if (-0.5 === r) return 1 / kr$1(t);
    if (2 === r) return t * t;
    if (3 === r) return t * t * t;
    if (4 === r) return (t *= t) * t;
    if (qr$1(r)) return Hr$1(t, r);
  }
  if ((Ar$1(Yr$1, t), (i = Yr$1[0]), 0 === Yr$1[1])) {
    if (0 === i) return Fr$1(t, r);
    if (1 === t) return 1;
    if (-1 === t && Nr$1(r)) return -1;
    if (qr$1(t)) return t === Dr$1 ? $r$1(-0, -r) : r < 0 ? 0 : Er$1;
  }
  if (t < 0 && !1 === yr$1(r)) return (t - t) / (t - t);
  if (
    (($ = zr$1(t)),
    (e = (i & Lr$1) | 0),
    (n = (o & Lr$1) | 0),
    (u = (o >>> Ur$1) | 0),
    (a = (a = (i >>> Ur$1) | 0) && Nr$1(r) ? -1 : 1),
    n > Or$1)
  ) {
    if (n > Pr$1) return Gr$1(t, r);
    if (e < Mr$1) return 1 === u ? a * Vr$1 * Vr$1 : a * Wr$1 * Wr$1;
    if (e > Rr$1) return 0 === u ? a * Vr$1 * Vr$1 : a * Wr$1 * Wr$1;
    l = Jr$1(Zr$1, $);
  } else l = Ir$1(Zr$1, $, e);
  if (
    ((c = (r - (f = Br$1(r, 0))) * l[0] + r * l[1]),
    (s = f * l[0]),
    Ar$1(Yr$1, (p = c + s)),
    (h = Cr$1(Yr$1[0])),
    (g = Cr$1(Yr$1[1])),
    h >= Qr$1)
  ) {
    if (0 != ((h - Qr$1) | g)) return a * Vr$1 * Vr$1;
    if (c + Xr$1 > p - s) return a * Vr$1 * Vr$1;
  } else if ((h & Lr$1) >= Sr$1) {
    if (0 != ((h - Tr$1) | g)) return a * Wr$1 * Wr$1;
    if (c <= p - s) return a * Wr$1 * Wr$1;
  }
  return a * Kr$1(h, s, c);
}
const _r$1 = $r$1;
function f$8(t) {
  return 0 === t
    ? 0.16666666666666602
    : 0.16666666666666602 +
        t *
          (t * (6613756321437934e-20 + t * (4.1381367970572385e-8 * t - 16533902205465252e-22)) -
            0.0027777777777015593);
}
const m$a = F$7;
const s$a = f$8;
function e$a(t, r, e) {
  let n;
  let $;
  let i;
  return (i = (n = t - r) - ($ = n * n) * s$a($)), m$a(1 - (r - (n * i) / (2 - i) - t), e);
}
const i$9 = t$A;
const p$8 = i$j;
const u$d = t$17;
const c$9 = I$c;
const j$8 = e$a;
const v$8 = 0.6931471803691238;
const l$9 = 1.9082149292705877e-10;
const d$8 = 1.4426950408889634;
const h$8 = 709.782712893384;
const x$8 = -745.1332191019411;
const b$8 = 1 / (1 << 28);
const g$7 = -b$8;
function k$7(t) {
  let r;
  return i$9(t) || t === c$9
    ? t
    : t === u$d
    ? 0
    : t > h$8
    ? c$9
    : t < x$8
    ? 0
    : t > g$7 && t < b$8
    ? 1 + t
    : ((r = p$8(t < 0 ? d$8 * t - 0.5 : d$8 * t + 0.5)), j$8(t - r * v$8, r * l$9, r));
}
const q$5 = k$7;
const a$l = 0.5772156649015329;
function c$8(t) {
  return 0 === t
    ? 0.08333333333334822
    : 0.08333333333334822 +
        t *
          (0.0034722222160545866 +
            t * (t * (0.0007873113957930937 * t - 0.00022954996161337813) - 0.0026813261780578124));
}
const l$8 = a$o;
const v$7 = _r$1;
const h$7 = q$5;
const g$6 = c$8;
const w$5 = 143.01608;
function x$7(t) {
  let r;
  let e;
  let n;
  return (
    (r = 1 + (r = 1 / t) * g$6(r)),
    (e = h$7(t)),
    (e = t > w$5 ? (n = v$7(t, 0.5 * t - 0.25)) * (n / e) : v$7(t, t - 0.5) / e),
    l$8 * e * r
  );
}
const N$7 = a$l;
function b$7(t, r) {
  return r / ((1 + N$7 * t) * t);
}
function d$7(t) {
  let r;
  let e;
  return 0 === t
    ? 1
    : ((t < 0 ? -t : t) <= 1
        ? ((r =
            1 +
            t *
              (0.4942148268014971 +
                t *
                  (0.20744822764843598 +
                    t *
                      (0.04763678004571372 +
                        t *
                          (0.010421379756176158 +
                            t * (0.0011913514700658638 + t * (0.00016011952247675185 + 0 * t))))))),
          (e =
            1 +
            t *
              (0.0714304917030273 +
                t *
                  (t *
                    (0.035823639860549865 +
                      t *
                        (0.011813978522206043 +
                          t *
                            (t * (0.0005396055804933034 + -23158187332412014e-21 * t) -
                              0.004456419138517973))) -
                    0.23459179571824335))))
        : ((r =
            0 +
            (t = 1 / t) *
              (0.00016011952247675185 +
                t *
                  (0.0011913514700658638 +
                    t *
                      (0.010421379756176158 +
                        t *
                          (0.04763678004571372 +
                            t * (0.20744822764843598 + t * (0.4942148268014971 + 1 * t))))))),
          (e =
            t *
              (0.0005396055804933034 +
                t *
                  (t *
                    (0.011813978522206043 +
                      t *
                        (0.035823639860549865 +
                          t * (t * (0.0714304917030273 + 1 * t) - 0.23459179571824335))) -
                    0.004456419138517973)) -
            23158187332412014e-21)),
      r / e);
}
const q$4 = t$A;
const z$2 = a$1Z;
const k$6 = a$L;
const y$4 = t$U;
const A$3 = o$19;
const B$3 = j$b;
const C$3 = I$c;
const D$3 = t$17;
const E$3 = a$q;
const F$3 = x$7;
const G$3 = b$7;
const H$3 = d$7;
function I$3(t) {
  let r;
  let e;
  let n;
  let $;
  if ((z$2(t) && t < 0) || t === D$3 || q$4(t)) return NaN;
  if (0 === t) return k$6(t) ? D$3 : C$3;
  if (t > 171.61447887182297) return C$3;
  if (t < -170.5674972726612) return 0;
  if ((e = y$4(t)) > 33)
    return t >= 0
      ? F$3(t)
      : ((r = 0 == (1 & (n = A$3(e))) ? -1 : 1),
        ($ = e - n) > 0.5 && ($ = e - (n += 1)),
        ($ = e * B$3(E$3 * $)),
        (r * E$3) / (y$4($) * F$3(e)));
  for ($ = 1; t >= 3; ) $ *= t -= 1;
  for (; t < 0; ) {
    if (t > -1e-9) return G$3(t, $);
    ($ /= t), (t += 1);
  }
  for (; t < 2; ) {
    if (t < 1e-9) return G$3(t, $);
    ($ /= t), (t += 1);
  }
  return 2 === t ? $ : $ * H$3((t -= 2));
}
const J$3 = I$3;
const e$9 = 1.4901161193847656e-8;
const a$k = 709.782712893384;
function u$c(t) {
  return 0 === t
    ? -0.3250421072470015
    : t * (t * (-23763016656650163e-21 * t - 0.005770270296489442) - 0.02848174957559851) -
        0.3250421072470015;
}
function o$4(t) {
  return 0 === t
    ? 0.39791722395915535
    : 0.39791722395915535 +
        t *
          (0.0650222499887673 +
            t * (0.005081306281875766 + t * (0.00013249473800432164 + -3960228278775368e-21 * t)));
}
function i$8(t) {
  return 0 === t
    ? 0.41485611868374833
    : 0.41485611868374833 +
        t *
          (t *
            (0.31834661990116175 +
              t * (t * (0.035478304325618236 + -0.002166375594868791 * t) - 0.11089469428239668)) -
            0.3722078760357013);
}
function a$j(t) {
  return 0 === t
    ? 0.10642088040084423
    : 0.10642088040084423 +
        t *
          (0.540397917702171 +
            t *
              (0.07182865441419627 +
                t * (0.12617121980876164 + t * (0.01363708391202905 + 0.011984499846799107 * t))));
}
function s$9(t) {
  return 0 === t
    ? -0.6938585727071818
    : t *
        (t *
          (t *
            (t * (t * (-9.814329344169145 * t - 81.2874355063066) - 184.60509290671104) -
              162.39666946257347) -
            62.375332450326006) -
          10.558626225323291) -
        0.6938585727071818;
}
function m$9(t) {
  return 0 === t
    ? 19.651271667439257
    : 19.651271667439257 +
        t *
          (137.65775414351904 +
            t *
              (434.56587747522923 +
                t *
                  (645.3872717332679 +
                    t *
                      (429.00814002756783 +
                        t *
                          (108.63500554177944 +
                            t * (6.570249770319282 + -0.0604244152148581 * t))))));
}
function c$7(t) {
  return 0 === t
    ? -0.799283237680523
    : t *
        (t *
          (t * (t * (-483.5191916086514 * t - 1025.0951316110772) - 637.5664433683896) -
            160.63638485582192) -
          17.757954917754752) -
        0.799283237680523;
}
function p$7(t) {
  return 0 === t
    ? 30.33806074348246
    : 30.33806074348246 +
        t *
          (325.7925129965739 +
            t *
              (1536.729586084437 +
                t *
                  (3199.8582195085955 +
                    t * (2553.0504064331644 + t * (474.52854120695537 + -22.44095244658582 * t)))));
}
const l$7 = t$A;
const j$7 = q$5;
const v$6 = p$9;
const b$6 = I$c;
const d$6 = t$17;
const h$6 = u$c;
const w$4 = o$4;
const x$6 = i$8;
const N$6 = a$j;
const g$5 = s$9;
const k$5 = m$9;
const q$3 = c$7;
const y$3 = p$7;
const z$1 = 1e-300;
const A$2 = 13877787807814457e-33;
const B$2 = 0.8450629115104675;
const C$2 = 0.12837916709551256;
const D$2 = 1;
const E$2 = -0.0023621185607526594;
const F$2 = 1;
const G$2 = -0.009864944034847148;
const H$2 = 1;
const I$2 = -0.0098649429247001;
const J$2 = 1;
function K$2(t) {
  let r;
  let e;
  let n;
  let $;
  let i;
  let o;
  let a;
  let u;
  if (l$7(t)) return NaN;
  if (t === b$6) return 0;
  if (t === d$6) return 2;
  if (0 === t) return 1;
  if ((t < 0 ? ((r = !0), (e = -t)) : ((r = !1), (e = t)), e < 0.84375))
    return e < A$2
      ? 1 - t
      : ((o = ($ = C$2 + (n = t * t) * h$6(n)) / (i = D$2 + n * w$4(n))),
        t < 0.25 ? 1 - (t + t * o) : (($ = t * o), 0.5 - ($ += t - 0.5)));
  if (e < 1.25)
    return (
      (a = E$2 + (i = e - 1) * x$6(i)),
      (u = F$2 + i * N$6(i)),
      r ? 1 + B$2 + a / u : 1 - B$2 - a / u
    );
  if (e < 28) {
    if (((i = 1 / (e * e)), e < 2.857142857142857)) ($ = G$2 + i * g$5(i)), (i = H$2 + i * k$5(i));
    else {
      if (t < -6) return 2 - z$1;
      ($ = I$2 + i * q$3(i)), (i = J$2 + i * y$3(i));
    }
    return (
      (n = v$6(e, 0)),
      ($ = j$7(-n * n - 0.5625) * j$7((n - e) * (n + e) + $ / i)),
      r ? 2 - $ / e : $ / e
    );
  }
  return r ? 2 - z$1 : z$1 * z$1;
}
const L$2 = K$2;
const a$i = -708.3964185322641;
function e$8(t, r) {
  let e;
  let n;
  if ((n = t.length) < 2 || 0 === r) return 0 === n ? 0 : t[0];
  for (e = t[(n -= 1)] * r + t[n - 1], n -= 2; n >= 0; ) (e = e * r + t[n]), (n -= 1);
  return e;
}
const n$5 = e$8;
function t$2(t) {
  let r;
  let e;
  let n;
  let $;
  if (t.length > 500)
    return function (r) {
      return n$5(t, r);
    };
  if (((r = 'return function evalpoly(x){'), 0 === (e = t.length))) r += 'return 0.0;';
  else if (1 === e) r += 'return ' + t[0] + ';';
  else {
    for (
      r += 'if(x===0.0){return ' + t[0] + ';}', r += 'return ' + t[0], n = e - 1, $ = 1;
      $ < e;
      $++
    )
      (r += '+x*'), $ < n && (r += '('), (r += t[$]);
    for ($ = 0; $ < n - 1; $++) r += ')';
    r += ';';
  }
  return (r += '}'), (r += '//# sourceURL=evalpoly.factory.js'), new Function(r)();
}
const o$3 = o$1b;
const u$b = e$8;
const f$7 = t$2;
o$3(u$b, 'factory', f$7);
const a$h = 6.283185307179586;
const a$g = eval;
const r$3 = a$g;
function a$f() {
  let t;
  try {
    r$3('"use strict"; (function* () {})'), (t = !0);
  } catch (r) {
    t = !1;
  }
  return t;
}
const u$a = a$f;
const e$7 = 2220446049250313e-31;
const a$e = t$U;
const o$2 = e$7;
const n$4 = 1e6;
function i$7(t, r) {
  let e;
  let n;
  let $;
  let i;
  let o;
  if (
    ((o = {}),
    arguments.length > 1 && (o = r),
    (e = o.tolerance || o$2),
    ($ = o.maxTerms || n$4),
    (i = o.initialValue || 0),
    !0 == ('function' === typeof t.next))
  ) {
    for (n of t) if (a$e(e * (i += n)) >= a$e(n) || 0 == --$) break;
  } else
    do {
      i += n = t();
    } while (a$e(e * i) < a$e(n) && --$);
  return i;
}
const s$8 = t$U;
const l$6 = e$7;
const f$6 = 1e6;
function m$8(t, r) {
  let e;
  let n;
  let $;
  let i;
  let o;
  (o = {}),
    arguments.length > 1 && (o = r),
    (e = o.tolerance || l$6),
    ($ = o.maxTerms || f$6),
    (i = o.initialValue || 0);
  do {
    i += n = t();
  } while (s$8(e * i) < s$8(n) && --$);
  return i;
}
const u$9 = u$a;
const c$6 = i$7;
const h$5 = m$8;
const v$5 = u$9() ? c$6 : h$5;
function e$6(t) {
  let r;
  let e;
  return 0 === t
    ? 1 / 0
    : ((t < 0 ? -t : t) <= 1
        ? ((r =
            709811.662581658 +
            t *
              (679979.8474157227 +
                t *
                  (293136.7857211597 +
                    t *
                      (74887.54032914672 +
                        t *
                          (12555.290582413863 +
                            t *
                              (1443.4299244417066 +
                                t *
                                  (115.24194596137347 +
                                    t *
                                      (6.309239205732627 +
                                        t *
                                          (0.22668404630224365 +
                                            t *
                                              (0.004826466289237662 +
                                                4624429436045379e-20 * t)))))))))),
          (e =
            0 +
            t *
              (362880 +
                t *
                  (1026576 +
                    t *
                      (1172700 +
                        t *
                          (723680 +
                            t *
                              (269325 +
                                t * (63273 + t * (9450 + t * (870 + t * (45 + 1 * t)))))))))))
        : ((r =
            4624429436045379e-20 +
            (t = 1 / t) *
              (0.004826466289237662 +
                t *
                  (0.22668404630224365 +
                    t *
                      (6.309239205732627 +
                        t *
                          (115.24194596137347 +
                            t *
                              (1443.4299244417066 +
                                t *
                                  (12555.290582413863 +
                                    t *
                                      (74887.54032914672 +
                                        t *
                                          (293136.7857211597 +
                                            t * (679979.8474157227 + 709811.662581658 * t)))))))))),
          (e =
            1 +
            t *
              (45 +
                t *
                  (870 +
                    t *
                      (9450 +
                        t *
                          (63273 +
                            t *
                              (269325 +
                                t *
                                  (723680 +
                                    t * (1172700 + t * (1026576 + t * (362880 + 0 * t))))))))))),
      r / e);
}
const r$2 = e$6;
const t$1 = r$2;
function e$5(t) {
  return 0 === t
    ? 0.6666666666666735
    : 0.6666666666666735 +
        t *
          (0.3999999999940942 +
            t *
              (0.2857142874366239 +
                t *
                  (0.22222198432149784 +
                    t *
                      (0.1818357216161805 + t * (0.15313837699209373 + 0.14798198605116586 * t)))));
}
const i$6 = t$A;
const s$7 = p$l;
const m$7 = p$k;
const u$8 = I$c;
const p$6 = t$17;
const h$4 = a$E;
const j$6 = e$5;
const l$5 = 0.6931471803691238;
const b$5 = 1.9082149292705877e-10;
const c$5 = 0.41421356237309503;
const d$5 = -0.2928932188134525;
const g$4 = 1.862645149230957e-9;
const v$4 = 5551115123125783e-32;
const w$3 = 9007199254740992;
const x$5 = 0.6666666666666666;
function N$5(t) {
  let r;
  let e;
  let n;
  let $;
  let i;
  let o;
  let a;
  let u;
  let f;
  let s;
  if (t < -1 || i$6(t)) return NaN;
  if (-1 === t) return p$6;
  if (t === u$8) return t;
  if (0 === t) return t;
  if (((s = 1), (n = t < 0 ? -t : t) < c$5)) {
    if (n < g$4) return n < v$4 ? t : t - t * t * 0.5;
    t > d$5 && ((s = 0), ($ = t), (e = 1));
  }
  return (
    0 !== s &&
      (n < w$3
        ? ((i = (s = ((e = s$7((f = 1 + t))) >> 20) - h$4) > 0 ? 1 - (f - t) : t - (f - 1)),
          (i /= f))
        : ((s = ((e = s$7((f = t))) >> 20) - h$4), (i = 0)),
      (e &= 1048575) < 434334
        ? (f = m$7(f, 1072693248 | e))
        : ((s += 1), (f = m$7(f, 1071644672 | e)), (e = (1048576 - e) >> 2)),
      ($ = f - 1)),
    (r = 0.5 * $ * $),
    0 === e
      ? 0 === $
        ? s * l$5 + (i += s * b$5)
        : s * l$5 - ((u = r * (1 - x$5 * $)) - (s * b$5 + i) - $)
      : ((u = (a = (o = $ / (2 + $)) * o) * j$6(a)),
        0 === s ? $ - (r - o * (r + u)) : s * l$5 - (r - (o * (r + u) + (s * b$5 + i)) - $))
  );
}
const k$4 = N$5;
const r$1 = I$c;
function a$d(t) {
  return 0 === t && 1 / t === r$1;
}
const n$3 = a$d;
const s$6 = n$3;
const a$c = t$A;
const f$5 = t$17;
const i$5 = I$c;
function e$4(t, r) {
  let e;
  let n;
  let $;
  let i;
  if (2 === (e = arguments.length))
    return a$c(t) || a$c(r)
      ? NaN
      : t === i$5 || r === i$5
      ? i$5
      : t === r && 0 === t
      ? s$6(t)
        ? t
        : r
      : t > r
      ? t
      : r;
  for (n = f$5, i = 0; i < e; i++) {
    if (a$c(($ = arguments[i])) || $ === i$5) return $;
    ($ > n || ($ === n && 0 === $ && s$6($))) && (n = $);
  }
  return n;
}
const m$6 = e$4;
const a$b = 10.900511;
const a$a = 2.718281828459045;
const a$9 = 0.34657359027997264;
function i$4(t) {
  return 0 === t
    ? -0.03333333333333313
    : t *
        (0.0015873015872548146 +
          t * (t * (4008217827329362e-21 + -2.0109921818362437e-7 * t) - 793650757867488e-19)) -
        0.03333333333333313;
}
const s$5 = t$A;
const m$5 = p$l;
const u$7 = p$k;
const l$4 = I$c;
const p$5 = t$17;
const h$3 = a$E;
const j$5 = a$9;
const c$4 = i$4;
const b$4 = 709.782712893384;
const d$4 = 0.6931471803691238;
const g$3 = 1.9082149292705877e-10;
const v$3 = 1.4426950408889634;
const w$2 = 38.816242111356935;
const x$4 = 1.0397207708399179;
function k$3(t) {
  let r;
  let e;
  let n;
  let $;
  let i;
  let o;
  let a;
  let u;
  let f;
  let s;
  let c;
  let l;
  if (t === l$4 || s$5(t)) return t;
  if (t === p$5) return -1;
  if (0 === t) return t;
  if ((t < 0 ? ((e = !0), (a = -t)) : ((e = !1), (a = t)), a >= w$2)) {
    if (e) return -1;
    if (a >= b$4) return l$4;
  }
  if (((i = 0 | m$5(a)), a > j$5))
    a < x$4
      ? e
        ? ((n = t + d$4), ($ = -g$3), (l = -1))
        : ((n = t - d$4), ($ = g$3), (l = 1))
      : ((l = e ? v$3 * t - 0.5 : v$3 * t + 0.5), (n = t - (s = l |= 0) * d$4), ($ = s * g$3)),
      (f = n - (t = n - $) - $);
  else {
    if (i < 1016070144) return t;
    l = 0;
  }
  return (
    (c = (u = t * (r = 0.5 * t)) * (((o = 1 + u * c$4(u)) - (s = 3 - o * r)) / (6 - t * s))),
    0 === l
      ? t - (t * c - u)
      : ((c = t * (c - f) - f),
        (c -= u),
        -1 === l
          ? 0.5 * (t - c) - 0.5
          : 1 === l
          ? t < -0.25
            ? -2 * (c - (t + 0.5))
            : 1 + 2 * (t - c)
          : l <= -2 || l > 56
          ? ((n = (m$5((a = 1 - (c - t))) + (l << 20)) | 0), (a = u$7(a, n)) - 1)
          : ((s = 1),
            l < 20
              ? (a = (s = u$7(s, (n = (1072693248 - (2097152 >> l)) | 0))) - (c - t))
              : ((a = t - (c + (s = u$7(s, (n = ((h$3 - l) << 20) | 0))))), (a += 1)),
            (n = (m$5(a) + (l << 20)) | 0),
            u$7(a, n)))
  );
}
const q$2 = k$3;
const e$3 = t$A;
const n$2 = t$U;
const s$4 = q$2;
const a$8 = k$c;
const p$4 = _r$1;
const u$6 = i$j;
function j$4(t, r) {
  let e;
  if (e$3(t) || e$3(r)) return NaN;
  if (0 === r) return 0;
  if (0 === t) return -1;
  if ((t < 0 && r % 2 == 0 && (t = -t), t > 0)) {
    if ((n$2(r * (t - 1)) < 0.5 || n$2(r) < 0.2) && (e = a$8(t) * r) < 0.5) return s$4(e);
  } else if (u$6(r) !== r) return NaN;
  return p$4(t, r) - 1;
}
const N$4 = j$4;
function i$3(t) {
  let r;
  let e;
  return 0 === t
    ? -0.01803556856784494
    : ((t < 0 ? -t : t) <= 1
        ? ((r =
            t *
              (0.02512664961998968 +
                t *
                  (0.049410315156753225 +
                    t *
                      (0.0172491608709614 +
                        t *
                          (t * (t * (0 * t - 3245886498259485e-20) - 0.0005410098692152044) -
                            0.0002594535632054381)))) -
            0.01803556856784494),
          (e =
            1 +
            t *
              (1.962029871977952 +
                t *
                  (1.4801966942423133 +
                    t *
                      (0.5413914320717209 +
                        t *
                          (0.09885042511280101 +
                            t *
                              (0.008213096746488934 +
                                t * (0.00022493629192211576 + -2.2335276320861708e-7 * t))))))))
        : ((r =
            0 +
            (t = 1 / t) *
              (t *
                (t *
                  (t *
                    (0.0172491608709614 +
                      t *
                        (0.049410315156753225 +
                          t * (0.02512664961998968 + -0.01803556856784494 * t))) -
                    0.0002594535632054381) -
                  0.0005410098692152044) -
                3245886498259485e-20)),
          (e =
            t *
              (0.00022493629192211576 +
                t *
                  (0.008213096746488934 +
                    t *
                      (0.09885042511280101 +
                        t *
                          (0.5413914320717209 +
                            t * (1.4801966942423133 + t * (1.962029871977952 + 1 * t)))))) -
            2.2335276320861708e-7)),
      r / e);
}
function a$7(t) {
  let r;
  let e;
  return 0 === t
    ? 0.04906224540690395
    : ((t < 0 ? -t : t) <= 1
        ? ((r =
            0.04906224540690395 +
            t *
              (t *
                (t *
                  (t *
                    (t * (-0.0010034668769627955 * t - 0.024014982064857155) - 0.1584135863906922) -
                    0.4065671242119384) -
                  0.4149833583594954) -
                0.09691175301595212)),
          (e =
            1 +
            t *
              (3.0234982984646304 +
                t *
                  (3.4873958536072385 +
                    t *
                      (1.9141558827442668 +
                        t *
                          (0.5071377386143635 +
                            t * (0.05770397226904519 + 0.001957681026011072 * t)))))))
        : ((r =
            (t = 1 / t) *
              (t *
                (t *
                  (t * (t * (0.04906224540690395 * t - 0.09691175301595212) - 0.4149833583594954) -
                    0.4065671242119384) -
                  0.1584135863906922) -
                0.024014982064857155) -
            0.0010034668769627955),
          (e =
            0.001957681026011072 +
            t *
              (0.05770397226904519 +
                t *
                  (0.5071377386143635 +
                    t *
                      (1.9141558827442668 +
                        t * (3.4873958536072385 + t * (3.0234982984646304 + 1 * t))))))),
      r / e);
}
function m$4(t) {
  let r;
  let e;
  return 0 === t
    ? -0.029232972183027003
    : ((t < 0 ? -t : t) <= 1
        ? ((r =
            t *
              (0.14421626775719232 +
                t *
                  (t *
                    (0.05428096940550536 +
                      t * (t * (0.0004311713426792973 + 0 * t) - 0.008505359768683364)) -
                    0.14244039073863127)) -
            0.029232972183027003),
          (e =
            1 +
            t *
              (t *
                (0.846973248876495 +
                  t *
                    (t *
                      (0.02558279715597587 +
                        t * (-8.271935218912905e-7 * t - 0.0010066679553914337)) -
                      0.22009515181499575)) -
                1.5016935605448505)))
        : ((r =
            0 +
            (t = 1 / t) *
              (0.0004311713426792973 +
                t *
                  (t *
                    (0.05428096940550536 +
                      t *
                        (t * (0.14421626775719232 + -0.029232972183027003 * t) -
                          0.14244039073863127)) -
                    0.008505359768683364))),
          (e =
            t *
              (t *
                (0.02558279715597587 +
                  t *
                    (t * (0.846973248876495 + t * (1 * t - 1.5016935605448505)) -
                      0.22009515181499575)) -
                0.0010066679553914337) -
            8.271935218912905e-7)),
      r / e);
}
const u$5 = k$c;
const s$3 = e$7;
const p$3 = i$3;
const v$2 = a$7;
const c$3 = m$4;
const j$3 = 0.15896368026733398;
const l$3 = 0.5281534194946289;
const d$3 = 0.45201730728149414;
function g$2(t, r, e) {
  let n;
  let $;
  let i;
  let o;
  if (t < s$3) return -u$5(t);
  if (0 === r || 0 === e) return 0;
  if ((($ = 0), t > 2)) {
    if (t >= 3) {
      do {
        (e -= 1), ($ += u$5((t -= 1)));
      } while (t >= 3);
      e = t - 2;
    }
    return (i = e * (t + 1)), (o = p$3(e)), $ + (i * j$3 + i * o);
  }
  return (
    t < 1 && (($ += -u$5(t)), (e = r), (r = t), (t += 1)),
    t <= 1.5
      ? ((i = v$2(r)), ($ += (n = r * e) * l$3 + n * i))
      : ((i = e * r), (o = c$3(-e)), ($ += i * d$3 + i * o))
  );
}
const h$2 = J$3;
const x$3 = q$2;
const N$3 = k$4;
const w$1 = t$A;
const b$3 = g$2;
function k$2(t) {
  return w$1(t)
    ? NaN
    : t < 0
    ? t < -0.5
      ? h$2(1 + t) - 1
      : x$3(-N$3(t) + b$3(t + 2, t + 1, t))
    : t < 2
    ? x$3(b$3(t + 1, t, t - 1))
    : h$2(1 + t) - 1;
}
const q$1 = k$2;
const e$2 = 11754943508222875e-54;
const o$1 = t$U;
const a$6 = e$2;
const l$2 = e$7;
const i$2 = 1e6;
function u$4(t, r, e) {
  let n;
  let $;
  let i;
  let o;
  let a;
  let u;
  let f;
  if (
    ((o = (f = (n = 'function' === typeof t.next) ? t.next().value : t())[1]),
    (i = f[0]),
    0 === o && (o = a$6),
    (a = o),
    (u = 0),
    !0 === n)
  )
    do {
      (f = t.next().value) &&
        (0 === (u = f[1] + f[0] * u) && (u = a$6),
        0 === (a = f[1] + f[0] / a) && (a = a$6),
        (o *= $ = a * (u = 1 / u)));
    } while (o$1($ - 1) > r && --e);
  else
    do {
      (f = t()) &&
        (0 === (u = f[1] + f[0] * u) && (u = a$6),
        0 === (a = f[1] + f[0] / a) && (a = a$6),
        (o *= $ = a * (u = 1 / u)));
    } while (f && o$1($ - 1) > r && --e);
  return i / o;
}
function f$4(t, r, e) {
  let n;
  let $;
  let i;
  let o;
  let a;
  let u;
  if (
    (0 === (i = (u = (n = 'function' === typeof t.next) ? t.next().value : t())[1]) && (i = a$6),
    (o = i),
    (a = 0),
    !0 === n)
  )
    do {
      (u = t.next().value) &&
        (0 === (a = u[1] + u[0] * a) && (a = a$6),
        0 === (o = u[1] + u[0] / o) && (o = a$6),
        (i *= $ = o * (a = 1 / a)));
    } while (u && o$1($ - 1) > r && --e);
  else
    do {
      (u = t()) &&
        (0 === (a = u[1] + u[0] * a) && (a = a$6),
        0 === (o = u[1] + u[0] / o) && (o = a$6),
        (i *= $ = o * (a = 1 / a)));
    } while (u && o$1($ - 1) > r && --e);
  return i;
}
function s$2(t, r) {
  let e;
  let n;
  let $;
  return (
    (n = {}),
    arguments.length > 1 && (n = r),
    (e = n.maxIter || i$2),
    ($ = n.tolerance || l$2),
    n.keep ? f$4(t, $, e) : u$4(t, $, e)
  );
}
const m$3 = t$U;
const c$2 = e$7;
const p$2 = e$2;
const v$1 = 1e6;
function h$1(t, r, e) {
  let n;
  let $;
  let i;
  let o;
  let a;
  let u;
  (a = (u = t())[1]), ($ = u[0]), 0 === a && (a = p$2), (i = a), (o = 0);
  do {
    (u = t()) &&
      (0 === (o = u[1] + u[0] * o) && (o = p$2),
      0 === (i = u[1] + u[0] / i) && (i = p$2),
      (a *= n = i * (o = 1 / o)));
  } while (u && m$3(n - 1) > r && --e);
  return $ / a;
}
function x$2(t, r, e) {
  let n;
  let $;
  let i;
  let o;
  let a;
  0 === (o = (a = t())[1]) && (o = p$2), ($ = o), (i = 0);
  do {
    (a = t()) &&
      (0 === (i = a[1] + a[0] * i) && (i = p$2),
      0 === ($ = a[1] + a[0] / $) && ($ = p$2),
      (o *= n = $ * (i = 1 / i)));
  } while (a && m$3(n - 1) > r && --e);
  return o;
}
function d$2(t, r) {
  let e;
  let n;
  let $;
  return (
    (n = {}),
    arguments.length > 1 && (n = r),
    ($ = n.tolerance || c$2),
    (e = n.maxIter || v$1),
    n.keep ? x$2(t, $, e) : h$1(t, $, e)
  );
}
const j$2 = u$a;
const g$1 = s$2;
const k$1 = d$2;
const y$2 = j$2() ? g$1 : k$1;
const A$1 = q$5;
function B$1(t, r) {
  let e;
  let n;
  let $;
  if (0 !== (n = A$1(-r))) for (e = n, $ = 1; $ < t; ++$) (e /= $), (n += e *= r);
  return n;
}
const C$1 = L$2;
const D$1 = a$n;
const E$1 = q$5;
const F$1 = a$q;
function G$1(t, r) {
  let e;
  let n;
  let $;
  let i;
  if (0 !== ($ = C$1(D$1(r))) && t > 1) {
    for (e = E$1(-r) / D$1(F$1 * r), e *= r, n = e /= 0.5, i = 2; i < t; ++i)
      (e /= i - 0.5), (n += e *= r);
    $ += n;
  }
  return $;
}
const H$1 = q$5;
const I$1 = _r$1;
const J$1 = k$c;
const K$1 = a$k;
const L$1 = a$i;
function M$1(t, r) {
  let e;
  return (
    (e = t * J$1(r)),
    r >= 1
      ? e < K$1 && -r > L$1
        ? I$1(r, t) * H$1(-r)
        : t >= 1
        ? I$1(r / H$1(r / t), t)
        : H$1(e - r)
      : e > L$1
      ? I$1(r, t) * H$1(-r)
      : r / t < K$1
      ? I$1(r / H$1(r / t), t)
      : H$1(e - r)
  );
}
function O$1(t) {
  return 0 === t
    ? -0.3333333333333333
    : t *
        (0.08333333333333333 +
          t *
            (t *
              (0.0011574074074074073 +
                t *
                  (0.0003527336860670194 +
                    t *
                      (t *
                        (3919263178522438e-20 +
                          t *
                            (t *
                              (t *
                                (8.296711340953087e-7 +
                                  t *
                                    (t *
                                      (6.707853543401498e-9 +
                                        t *
                                          (1.0261809784240309e-8 +
                                            t *
                                              (9.14769958223679e-10 * t - 4.382036018453353e-9))) -
                                      1.7665952736826078e-7)) -
                                185406221071516e-20) -
                              21854485106799924e-22)) -
                        0.0001787551440329218))) -
              0.014814814814814815)) -
        0.3333333333333333;
}
function P$1(t) {
  return 0 === t
    ? -0.001851851851851852
    : t *
        (t *
          (0.0026455026455026454 +
            t *
              (t *
                (0.00020576131687242798 +
                  t *
                    (t *
                      (t *
                        (764916091608111e-20 +
                          t *
                            (t *
                              (4.647127802807434e-9 +
                                t *
                                  (1.378633446915721e-7 +
                                    t * (1.1951628599778148e-8 * t - 5.752545603517705e-8))) -
                              16120900894563446e-22)) -
                        18098550334489977e-21) -
                      4.018775720164609e-7)) -
                0.0009902263374485596)) -
          0.003472222222222222) -
        0.001851851851851852;
}
function Q$1(t) {
  return 0 === t
    ? 0.004133597883597883
    : 0.004133597883597883 +
        t *
          (t *
            (0.0007716049382716049 +
              t *
                (20093878600823047e-22 +
                  t *
                    (t *
                      (52923448829120125e-21 +
                        t *
                          (t *
                            (3.423578734096138e-8 +
                              t *
                                (13721957309062932e-22 +
                                  t * (1.4280614206064242e-7 * t - 6.298992138380055e-7))) -
                            12760635188618728e-21)) -
                      0.00010736653226365161))) -
            0.0026813271604938273);
}
function R$1(t) {
  return 0 === t
    ? 0.0006494341563786008
    : 0.0006494341563786008 +
        t *
          (0.00022947209362139917 +
            t *
              (t *
                (0.00026772063206283885 +
                  t *
                    (t *
                      (t *
                        (11082654115347302e-21 +
                          t * (14230900732435883e-22 * t - 56749528269915965e-22)) -
                        2.396505113867297e-7) -
                      7561801671883977e-20)) -
                0.0004691894943952557));
}
function S$1(t) {
  return 0 === t
    ? -0.0008618882909167117
    : t *
        (0.0007840392217200666 +
          t *
            (t *
              (t * (6641498215465122e-20 + t * (11375726970678419e-21 * t - 3968365047179435e-20)) -
                14638452578843418e-22) -
              0.0002990724803031902)) -
        0.0008618882909167117;
}
function T$1(t) {
  return 0 === t
    ? -0.00033679855336635813
    : t *
        (t *
          (0.0002772753244959392 +
            t *
              (t *
                (6797780477937208e-20 +
                  t *
                    (1.419062920643967e-7 +
                      t *
                        (t * (8018470256334202e-21 + -2291481176508095e-21 * t) -
                          13594048189768693e-21))) -
                0.00019932570516188847)) -
          6972813758365858e-20) -
        0.00033679855336635813;
}
function U$1(t) {
  return 0 === t
    ? 0.0005313079364639922
    : 0.0005313079364639922 +
        t *
          (t *
            (0.0002708782096718045 +
              t *
                (7.902353232660328e-7 +
                  t *
                    (t * (561168275310625e-19 + -18329116582843375e-21 * t) -
                      8153969367561969e-20))) -
            0.0005921664373536939);
}
function W$1(t) {
  return 0 === t
    ? 0.00034436760689237765
    : 0.00034436760689237765 +
        t *
          (5171790908260592e-20 +
            t *
              (t * (0.0002812695154763237 + -0.00010976582244684731 * t) - 0.00033493161081142234));
}
function X$1(t) {
  return 0 === t
    ? -0.0006526239185953094
    : t * (0.0008394987206720873 + -0.000438297098541721 * t) - 0.0006526239185953094;
}
const Y$1 = u$b;
const Z$1 = L$2;
const $$1 = a$n;
const _$1 = q$5;
const rr$1 = k$c;
const tr$1 = a$h;
const or = O$1;
const nr$1 = P$1;
const er$1 = Q$1;
const ar$1 = R$1;
const mr = S$1;
const fr = T$1;
const ir$1 = U$1;
const sr = W$1;
const ur = X$1;
const cr = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
function pr(t, r) {
  let e;
  let n;
  let $;
  let i;
  let o;
  return (
    (i = t * ($ = -rr$1(1 + (n = (r - t) / t)) + n)),
    (o = $$1(2 * $)),
    r < t && (o = -o),
    (cr[0] = or(o)),
    (cr[1] = nr$1(o)),
    (cr[2] = er$1(o)),
    (cr[3] = ar$1(o)),
    (cr[4] = mr(o)),
    (cr[5] = fr(o)),
    (cr[6] = ir$1(o)),
    (cr[7] = sr(o)),
    (cr[8] = ur(o)),
    (cr[9] = -0.0005967612901927463),
    (e = Y$1(cr, 1 / t)),
    (e *= _$1(-i) / $$1(tr$1 * t)),
    r < t && (e = -e),
    e + Z$1($$1(i)) / 2
  );
}
function lr(t, r) {
  let e = 1;
  let n = t;
  const $ = r;
  return function () {
    const t = e;
    return (e *= $ / (n += 1)), t;
  };
}
const jr = v$5;
const vr = lr;
function hr(t, r, e) {
  let n;
  return (e = e || 0), (n = vr(t, r)), jr(n, { initialValue: e });
}
const gr = t$1;
const br = rr$3;
const kr = J$3;
const xr = k$4;
const wr = a$n;
const dr = t$U;
const qr = q$5;
const zr = _r$1;
const Nr = m$6;
const Vr = m$q;
const yr = k$c;
const Ar = a$k;
const Br = a$i;
const Cr = a$b;
const Dr = a$a;
function Er(t, r) {
  let e;
  let n;
  let $;
  let i;
  let o;
  let a;
  let u;
  return (
    (u = (r - t - Cr + 0.5) / ($ = t + Cr - 0.5)),
    t < 1
      ? r <= Br
        ? qr(t * yr(r) - r - br(t))
        : (zr(r, t) * qr(-r)) / kr(t)
      : (dr(u * u * t) <= 100 && t > 150
          ? ((e = t * (xr(u) - u) + (r * (0.5 - Cr)) / $), (e = qr(e)))
          : ((i = t * yr(r / $)),
            Vr(i, (o = t - r)) <= Br || Nr(i, o) >= Ar
              ? ((n = o / t),
                Vr(i, o) / 2 > Br && Nr(i, o) / 2 < Ar
                  ? (e = (a = zr(r / $, t / 2) * qr(o / 2)) * a)
                  : Vr(i, o) / 4 > Br && Nr(i, o) / 4 < Ar && r > t
                  ? ((e = (a = zr(r / $, t / 4) * qr(o / 4)) * a), (e *= e))
                  : (e = n > Br && n < Ar ? zr((r * qr(n)) / $, t) : qr(i + o)))
              : (e = zr(r / $, t) * qr(o))),
        (e *= wr($ / Dr) / gr(t)))
  );
}
function Fr(t, r) {
  let e;
  let n;
  let $;
  let i;
  return (
    (e = -r),
    (r = -r),
    (n = t + 1),
    ($ = 1),
    function () {
      return (i = e / n), (e *= r), (e /= $ += 1), (n += 1), i;
    }
  );
}
const Gr = N$4;
const Hr = v$5;
const Ir = q$1;
const Jr = Fr;
function Kr(t, r, e) {
  let n;
  let $;
  let i;
  let o;
  return (
    ($ = ((n = Ir(t)) + 1) / t),
    (n -= i = Gr(r, t)),
    (n /= t),
    (o = Jr(t, r)),
    (n = -(i += 1) * Hr(o, { initialValue: ((e ? $ : 0) - n) / i })),
    e && (n = -n),
    [n, $]
  );
}
function Lr(t, r) {
  let e = r - t + 1;
  const n = t;
  let $ = 0;
  return function () {
    return [($ += 1) * (n - $), (e += 2)];
  };
}
const Mr = y$2;
const Or = Lr;
function Pr(t, r) {
  const e = Or(t, r);
  return 1 / (r - t + 1 + Mr(e));
}
const Qr = rr$3;
const Rr = o$19;
const Sr = J$3;
const Tr = t$U;
const Ur = q$5;
const Wr = _r$1;
const Xr = k$c;
const Yr = e$9;
const Zr = e$s;
const $r = a$o;
const _r = a$k;
const rt = I$c;
const tt = B$1;
const ot = G$1;
const nt = M$1;
const et = pr;
const at = hr;
const mt = Er;
const ft = Kr;
const it = Pr;
const st = 170;
function ut(t, r, e, n) {
  let $;
  let i;
  let o;
  let a;
  let u;
  let f;
  let s;
  let c;
  let l;
  let p;
  let h;
  let g;
  let d;
  if (t < 0 || r <= 0) return NaN;
  if (((i = void 0 === e || e), (s = n), (c = 0), r >= st && !i))
    return (
      s && 4 * r < t
        ? ((c = r * Xr(t) - t), (c += Xr(it(r, t))))
        : !s && r > 4 * t
        ? ((c = r * Xr(t) - t), (c += Xr(at(r, t, (a = 0)) / r)))
        : 0 === (c = ut(r, t, !0, s))
        ? s
          ? ((c = Xr((c = 1 + 1 / (12 * r) + 1 / (288 * r * r))) - r + (r - 0.5) * Xr(r)),
            (c += Xr($r)))
          : ((c = r * Xr(t) - t), (c += Xr(at(r, t, (a = 0)) / r)))
        : (c = Xr(c) + Qr(r)),
      c > _r ? rt : Ur(c)
    );
  switch (
    (r < 30 && r <= t + 1 && t < _r
      ? (u = !(l = (g = Rr(r)) === r) && 0.5 === Tr(g - r))
      : (l = u = !1),
    l && t > 0.6
      ? ((s = !s), (o = 0))
      : u && t > 0.2
      ? ((s = !s), (o = 1))
      : t < Yr && r > 1
      ? (o = 6)
      : t < 0.5
      ? (o = -0.4 / Xr(t) < r ? 2 : 3)
      : t < 1.1
      ? (o = 0.75 * t < r ? 2 : 3)
      : ((f = !1),
        i &&
          r > 20 &&
          ((p = Tr((t - r) / r)), r > 200 ? 20 / r > p * p && (f = !0) : p < 0.4 && (f = !0)),
        f ? (o = 5) : t - 1 / (3 * t) < r ? (o = 2) : ((o = 4), (s = !s))),
    o)
  ) {
    case 0:
      (c = tt(r, t)), !1 === i && (c *= Sr(r));
      break;
    case 1:
      (c = ot(r, t)), !1 === i && (c *= Sr(r));
      break;
    case 2:
      0 !== (c = i ? mt(r, t) : nt(r, t)) &&
        ((a = 0),
        ($ = !1),
        s &&
          ((a = i ? 1 : Sr(r)),
          i || c >= 1 || Zr * c > a
            ? ((a /= c), i || r < 1 || Zr / r > a ? ((a *= -r), ($ = !0)) : (a = 0))
            : (a = 0))),
        (c *= at(r, t, a) / r),
        $ && ((s = !1), (c = -c));
      break;
    case 3:
      (c = (h = ft(r, t, (s = !s)))[0]), (d = h[1]), (s = !1), i && (c /= d);
      break;
    case 4:
      0 !== (c = i ? mt(r, t) : nt(r, t)) && (c *= it(r, t));
      break;
    case 5:
      (c = et(r, t)), t >= r && (s = !s);
      break;
    case 6:
      (c = i ? Wr(t, r) / Sr(r + 1) : Wr(t, r) / r), (c *= 1 - (r * t) / (r + 1));
  }
  return i && c > 1 && (c = 1), s && (c = (i ? 1 : Sr(r)) - c), c;
}
const ct = ut;
function n$1(t) {
  return function () {
    return t;
  };
}
const r = n$1;
const o = t$A;
function a$5(t, r) {
  return o(t) || o(r) ? NaN : t < r ? 0 : 1;
}
const e$1 = r;
const i$1 = t$A;
function u$3(t) {
  return i$1(t)
    ? e$1(NaN)
    : function (r) {
        return i$1(r) ? NaN : r < t ? 0 : 1;
      };
}
const f$3 = o$1b;
const s$1 = a$5;
const m$2 = u$3;
f$3(s$1, 'factory', m$2);
const f$2 = ct;
const i = t$A;
const m$1 = I$c;
function s(t, r, e) {
  return i(t) || i(r) || i(e) || r < 0 || e <= 0
    ? NaN
    : 0 === r
    ? t < 0
      ? 0
      : 1
    : t <= 0
    ? 0
    : t === m$1
    ? 1
    : f$2(t * e, r);
}
const u$2 = r;
const c$1 = s$1.factory;
const p$1 = ct;
const l$1 = t$A;
const j$1 = I$c;
function d$1(t, r) {
  return l$1(t) || l$1(r) || t < 0 || r <= 0
    ? u$2(NaN)
    : 0 === t
    ? c$1(0)
    : function (e) {
        return e <= 0 ? 0 : e === j$1 ? 1 : p$1(e * r, t);
      };
}
const y$1 = o$1b;
const N$2 = s;
const b$2 = d$1;
y$1(N$2, 'factory', b$2);
const t = N$2;
function e(r, e) {
  return t(r, e / 2, 0.5);
}
const n = N$2.factory;
function a$4(t) {
  return n(t / 2, 0.5);
}
const f$1 = o$1b;
const m = e;
const u$1 = a$4;
f$1(m, 'factory', u$1);
const a$3 = 9007199254740991;
const a$2 = 308;
const a$1 = -308;
const a = -324;
const f = t$A;
const p = f$o;
const j = _r$1;
const l = t$U;
const x$1 = r$5;
const b$1 = a$3;
const c = a$2;
const u = a$1;
const h = a;
const v = b$1 + 1;
const d = 1e308;
function N$1(t, r) {
  let e;
  let n;
  return f(t) || f(r) || p(r)
    ? NaN
    : p(t) || 0 === t || r < h || (l(t) > v && r <= 0)
    ? t
    : r > c
    ? 0 * t
    : r < u
    ? ((e = j(10, -(r + c))), p((n = t * d * e)) ? t : x$1(n) / d / e)
    : ((e = j(10, -r)), p((n = t * e)) ? t : x$1(n) / e);
}
const g = N$1;
const b = m$O;
const w = j$v;
const y = y$k.isPrimitive;
const E = e$1e;
const T = g;
function V(t) {
  return function (r) {
    let e;
    let n;
    let $;
    if (((n = 4), (e = !0), arguments.length > 0)) {
      if (!w(r))
        throw new TypeError('invalid argument. Must provide an object. Value: `' + r + '`.');
      if (E(r, 'digits')) {
        if (!b(r.digits))
          throw new TypeError(
            'invalid option. `digits` option must be a positive integer. Option: `' +
              r.digits +
              '`.'
          );
        n = r.digits;
      }
      if (E(r, 'decision')) {
        if (!y(r.decision))
          throw new TypeError(
            'invalid option. `decision` option must be a boolean primitive. Option: `' +
              r.decision +
              '`.'
          );
        e = r.decision;
      }
    }
    return (
      ($ = ''),
      ($ += t.method),
      ($ += '\n\n'),
      ($ += 'Null hypothesis: the two variables are independent'),
      ($ += '\n\n'),
      ($ += '    pValue: ' + T(t.pValue, -n) + '\n'),
      ($ += '    statistic: ' + T(t.statistic, -n) + '\n'),
      ($ += '    degrees of freedom: ' + t.df + '\n'),
      ($ += '\n'),
      e &&
        (($ += 'Test Decision: '),
        t.rejected
          ? ($ +=
              'Reject null in favor of alternative at ' + 100 * t.alpha + '% significance level')
          : ($ +=
              'Fail to reject null in favor of alternative at ' +
              100 * t.alpha +
              '% significance level'),
        ($ += '\n')),
      $
    );
  };
}
const x = 0.05;
const O = !0;
const F = { alpha: x, correct: O };
const P = f$H;
function k(t, r) {
  let e;
  let n;
  let $;
  let i;
  let o;
  let a;
  let u;
  let f;
  let s;
  let c;
  if (
    (1 === r
      ? ((o = t.shape[1]), (a = t.shape[0]), (n = t.strides[1]), ($ = t.strides[0]))
      : ((o = t.shape[0]), (a = t.shape[1]), (n = t.strides[0]), ($ = t.strides[1])),
    0 === o || 0 === a)
  )
    return 0;
  for (e = new P(o), u = t.offset, f = 0; f < o; f++) {
    for (c = u + f * n, i = 0, s = 0; s < a; s++) i += t.data[c + s * $];
    e[f] = i;
  }
  return e;
}
const q = we;
const R = f$H;
function C(t, r) {
  let e;
  let n;
  const $ = t.length;
  const i = r.length;
  const o = q(new R($ * i), { shape: [$, i] });
  for (e = 0; e < $; e++) for (n = 0; n < i; n++) o.set(e, n, t[e] * r[n]);
  return o;
}
const D = f$H;
const M = t$U;
function N(t, r) {
  let e;
  let n;
  let $;
  let i;
  let o;
  for (e = new D(t.length), i = t.shape[0], o = t.shape[1], n = 0; n < i; n++)
    for ($ = 0; $ < o; $++) e[n * i + $] = M(t.get(n, $) - r.get(n, $));
  return e;
}
const z = y$k.isPrimitive;
const A = g$p.isPrimitive;
const B = j$v;
const G = b$l;
const H = e$1e;
function I(t, r) {
  if (!B(r))
    return new TypeError(
      'invalid argument. Options argument must be an object. Value: `' + r + '`.'
    );
  if (H(r, 'alpha')) {
    if (((t.alpha = r.alpha), !A(t.alpha) || G(t.alpha)))
      return new TypeError(
        'invalid option. `alpha` option must be a number primitive. Option: `' + t.alpha + '`.'
      );
    if (t.alpha < 0 || t.alpha > 1)
      return new RangeError(
        'invalid option. `alpha` option must be a number on the interval `[0,1]`. Value: `' +
          t.alpha +
          '`.'
      );
  }
  return H(r, 'correct') && ((t.correct = r.correct), !z(t.correct))
    ? new TypeError(
        'invalid option. `correct` option must be a boolean primitive. Option: `' +
          t.simulate +
          '`.'
      )
    : null;
}
const J = o$1c;
const K = s$T;
const L = n$1n;
const Q = i$14;
const S = we;
const U = i$r;
const W = m$r;
const X = m$q;
const Y = lr$2;
const Z = m;
const $ = V;
const _ = F;
const rr = k;
const er = C;
const tr = N;
const ir = I;
function ar(t, r) {
  let e;
  let n;
  let i;
  let o;
  let a;
  let u;
  let f;
  let s;
  let c;
  let l;
  let p;
  let h;
  let g;
  let d;
  let v;
  let y;
  if ((Q(t) && (t = S(t)), !L(t)))
    throw new TypeError(
      'invalid argument. First argument `x` must be an array of arrays or ndarray-like object with dimension two. Value: `' +
        t +
        '`.'
    );
  if (!K(t.data))
    throw new TypeError(
      'invalid argument. First argument `x` must contain nonnegative integers. Value: `' + t + '`.'
    );
  if (((l = Y(_)), arguments.length > 1 && (g = ir(l, r)))) throw g;
  for (
    v = W(t.length, t.data, 1),
      s = t.shape[0],
      c = t.shape[1],
      n = rr(t, 1),
      i = rr(t, 2),
      u = er(i, n),
      y = 0;
    y < u.length;
    y++
  )
    u.data[y] /= v;
  if (((e = tr(t, u)), l.correct && 2 === s && 2 === c)) {
    for (o = U(), y = 0; y < e.length; y++) o(e[y]);
    for (a = X(0.5, o()), y = 0; y < e.length; y++) e[y] -= a;
  }
  for (y = 0; y < e.length; y++) (e[y] *= e[y]), (e[y] /= u.data[y]);
  return (
    (h = W(e.length, e, 1)),
    (p = 1 - Z(h, (f = (s - 1) * (c - 1)))),
    J((d = {}), 'rejected', p <= l.alpha),
    J(d, 'alpha', l.alpha),
    J(d, 'pValue', p),
    J(d, 'df', f),
    J(d, 'expected', u),
    J(d, 'statistic', h),
    J(d, 'method', 'Chi-square independence test'),
    J(d, 'print', $(d)),
    d
  );
}
const nr = ar;
export { nr as default };
