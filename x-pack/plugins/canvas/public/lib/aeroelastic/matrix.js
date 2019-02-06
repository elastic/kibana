/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }]*/

/**
 * transpose
 *
 * Turns a row major ordered vector representation of a 4 x 4 matrix into a column major ordered vector representation, or
 * the other way around.
 *
 * Must pass a row major ordered vector if the goal is to obtain a column major ordered vector.
 *
 * We're using row major order in the _source code_ as this results in the correct visual shape of the matrix, but
 * `transform3d` needs column major order.
 *
 * This is what the matrix is:                  Eg. this is the equivalent matrix of `translate3d(${x}px, ${y}px, ${z}px)`:
 *
 *         a e i m                                                           1 0 0 x
 *         b f j n                                                           0 1 0 y
 *         c g k o                                                           0 0 1 z
 *         d h l p                                                           0 0 0 1
 *
 *  but it's _not_ represented as a 2D array or array of arrays. CSS3 `transform3d` expects it as this vector:
 *
 *      [a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p]
 *
 *  so it's clear that the first _column vector_ corresponds to a, b, c, d but in source code, we must write a, e, i, m in
 *  the first row if we want to visually resemble the above 4x4 matrix, ie. if we don't want that us programmers transpose
 *  matrices in our heads.
 *
 */
const transpose = ([a, e, i, m, b, f, j, n, c, g, k, o, d, h, l, p]) => [
  a,
  b,
  c,
  d,
  e,
  f,
  g,
  h,
  i,
  j,
  k,
  l,
  m,
  n,
  o,
  p,
];

const ORIGIN = [0, 0, 0, 1];

const NULLVECTOR = [0, 0, 0, 0];

const NULLMATRIX = transpose([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

const UNITMATRIX = transpose([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

// currently these functions expensively transpose; in a future version we can have way more efficient matrix operations
// (eg. pre-transpose)
const translate = (x, y, z) => transpose([1, 0, 0, x, 0, 1, 0, y, 0, 0, 1, z, 0, 0, 0, 1]);

const scale = (x, y, z) => transpose([x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1]);

const shear = (x, y) => transpose([1, x, 0, 0, y, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

const perspective = d => transpose([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, -1 / d, 1]);

/**
 * rotate
 *
 * @param {number} x the x coordinate of the vector around which to rotate
 * @param {number} y the y coordinate of the vector around which to rotate
 * @param {number} z the z coordinate of the vector around which to rotate
 * @param {number} a rotation angle in radians
 * @returns {number[][]} a 4x4 transform matrix in column major order
 */
const rotate = (x, y, z, a) => {
  // it looks like the formula but inefficient; common terms could be precomputed, transpose can be avoided.
  // an optimizing compiler eg. Google Closure Advanced could perform most of the optimizations and JIT also watches out
  // for eg. common expressions

  const sinA = Math.sin(a);
  const coshAi = 1 - Math.cos(a);

  return transpose([
    1 + coshAi * (x * x - 1),
    z * sinA + x * y * coshAi,
    -y * sinA + x * y * coshAi,
    0,
    -z * sinA + x * y * coshAi,
    1 + coshAi * (y * y - 1),
    x * sinA + y * x * coshAi,
    0,
    y * sinA + x * z * coshAi,
    -x * sinA + y * z * coshAi,
    1 + coshAi * (z * z - 1),
    0,
    0,
    0,
    0,
    1,
  ]);
};

/**
 * rotate_ functions
 *
 * @param {number} a
 * @returns {number[][]}
 *
 * Should be replaced with more efficient direct versions rather than going through the generic `rotate3d` function.
 */
const rotateX = a => rotate(1, 0, 0, a);
const rotateY = a => rotate(0, 1, 0, a);
const rotateZ = a => rotate(0, 0, 1, a);

/**
 * multiply
 *
 * Matrix multiplies two matrices of column major format, returning the result in the same format
 *
 *
 *                               A    E    I    M
 *                               B    F    J    N
 *                               C    G    K    O
 *                               D    H    L    P
 *
 *         a    e    i    m      .    .    .    .
 *         b    f    j    n      .    .    .    .
 *         c    g    k    o      .    .    .    .
 *         d    h    l    p      .    .    .    d * M + h * N + l * O + p * P
 *
 */
const mult = (
  [a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p],
  [A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P]
) => [
  a * A + e * B + i * C + m * D,
  b * A + f * B + j * C + n * D,
  c * A + g * B + k * C + o * D,
  d * A + h * B + l * C + p * D,

  a * E + e * F + i * G + m * H,
  b * E + f * F + j * G + n * H,
  c * E + g * F + k * G + o * H,
  d * E + h * F + l * G + p * H,

  a * I + e * J + i * K + m * L,
  b * I + f * J + j * K + n * L,
  c * I + g * J + k * K + o * L,
  d * I + h * J + l * K + p * L,

  a * M + e * N + i * O + m * P,
  b * M + f * N + j * O + n * P,
  c * M + g * N + k * O + o * P,
  d * M + h * N + l * O + p * P,
];

const multiply = (...elements) =>
  elements.slice(1).reduce((prev, next) => mult(prev, next), elements[0]);

/**
 * mvMultiply
 *
 * Multiplies a matrix and a vector
 *
 *
 *                               A
 *                               B
 *                               C
 *                               D
 *
 *         a    e    i    m      .
 *         b    f    j    n      .
 *         c    g    k    o      .
 *         d    h    l    p      d * A + h * B + l * C + p * D
 *
 */
const mvMultiply = ([a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p], [A, B, C, D]) => [
  a * A + e * B + i * C + m * D,
  b * A + f * B + j * C + n * D,
  c * A + g * B + k * C + o * D,
  d * A + h * B + l * C + p * D,
];

const normalize = ([A, B, C, D]) => (D === 1 ? [A, B, C, D] : [A / D, B / D, C / D, 1]);

/**
 * invert
 *
 * Inverts the matrix
 *
 *         a    e    i    m
 *         b    f    j    n
 *         c    g    k    o
 *         d    h    l    p
 */
const invert = ([a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p]) => {
  const inv = [
    f * k * p - f * l * o - j * g * p + j * h * o + n * g * l - n * h * k,
    -b * k * p + b * l * o + j * c * p - j * d * o - n * c * l + n * d * k,
    b * g * p - b * h * o - f * c * p + f * d * o + n * c * h - n * d * g,
    -b * g * l + b * h * k + f * c * l - f * d * k - j * c * h + j * d * g,
    -e * k * p + e * l * o + i * g * p - i * h * o - m * g * l + m * h * k,
    a * k * p - a * l * o - i * c * p + i * d * o + m * c * l - m * d * k,
    -a * g * p + a * h * o + e * c * p - e * d * o - m * c * h + m * d * g,
    a * g * l - a * h * k - e * c * l + e * d * k + i * c * h - i * d * g,
    e * j * p - e * l * n - i * f * p + i * h * n + m * f * l - m * h * j,
    -a * j * p + a * l * n + i * b * p - i * d * n - m * b * l + m * d * j,
    a * f * p - a * h * n - e * b * p + e * d * n + m * b * h - m * d * f,
    -a * f * l + a * h * j + e * b * l - e * d * j - i * b * h + i * d * f,
    -e * j * o + e * k * n + i * f * o - i * g * n - m * f * k + m * g * j,
    a * j * o - a * k * n - i * b * o + i * c * n + m * b * k - m * c * j,
    -a * f * o + a * g * n + e * b * o - e * c * n - m * b * g + m * c * f,
    a * f * k - a * g * j - e * b * k + e * c * j + i * b * g - i * c * f,
  ];

  const det = a * inv[0] + b * inv[4] + c * inv[8] + d * inv[12];

  if (det === 0) {
    return false; // no solution
  } else {
    const recDet = 1 / det;

    for (let index = 0; index < 16; index++) {
      inv[index] *= recDet;
    }

    return inv;
  }
};

const translateComponent = a => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, a[12], a[13], a[14], 1];

const compositeComponent = ([a, b, c, d, e, f, g, h, i, j, k, l, _m, _n, _o, p]) => [
  a,
  b,
  c,
  d,
  e,
  f,
  g,
  h,
  i,
  j,
  k,
  l,
  0,
  0,
  0,
  p,
];

const add = (
  [a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p],
  [A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P]
) => [
  a + A,
  b + B,
  c + C,
  d + D,
  e + E,
  f + F,
  g + G,
  h + H,
  i + I,
  j + J,
  k + K,
  l + L,
  m + M,
  n + N,
  o + O,
  p + P,
];

const subtract = (
  [a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p],
  [A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P]
) => [
  a - A,
  b - B,
  c - C,
  d - D,
  e - E,
  f - F,
  g - G,
  h - H,
  i - I,
  j - J,
  k - K,
  l - L,
  m - M,
  n - N,
  o - O,
  p - P,
];

const reduceTransforms = transforms =>
  transforms.length === 1
    ? transforms[0]
    : transforms.slice(1).reduce((prev, next) => multiply(prev, next), transforms[0]);

// applies an arbitrary number of transforms - left to right - to a preexisting transform matrix
const applyTransforms = (transforms, previousTransformMatrix) =>
  transforms.reduce((prev, next) => multiply(prev, next), previousTransformMatrix);

const clamp = (low, high, value) => Math.min(high, Math.max(low, value));

const matrixToAngle = transformMatrix => {
  // clamping is needed, otherwise inevitable floating point inaccuracies can cause NaN
  const z0 = Math.acos(clamp(-1, 1, transformMatrix[0]));
  const z1 = Math.asin(clamp(-1, 1, transformMatrix[1]));
  return z1 > 0 ? z0 : -z0;
};

module.exports = {
  ORIGIN,
  NULLVECTOR,
  NULLMATRIX,
  UNITMATRIX,
  transpose,
  translate,
  shear,
  rotateX,
  rotateY,
  rotateZ,
  scale,
  perspective,
  matrixToAngle,
  multiply,
  mvMultiply,
  invert,
  normalize,
  applyTransforms,
  reduceTransforms,
  translateComponent,
  compositeComponent,
  add,
  subtract,
};
