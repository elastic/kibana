/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const ORIGIN = [0, 0, 1];

export const UNITMATRIX = [1, 0, 0, 0, 1, 0, 0, 0, 1];

export const translate = (x, y) => [1, 0, 0, 0, 1, 0, x, y, 1];

export const scale = (x, y) => [x, 0, 0, 0, y, 0, 0, 0, 1];

/**
 * multiply
 *
 * Matrix multiplies two matrices of column major format, returning the result in the same format
 *
 *
 *                          A    D    G
 *                          B    E    H
 *                          C    F    I
 *
 *         a    d    g      .    .    .
 *         b    e    h      .    .    .
 *         c    f    i      .    .    c * G + f * H + i * I
 *
 */
const mult = ([a, b, c, d, e, f, g, h, i], [A, B, C, D, E, F, G, H, I]) => [
  a * A + d * B + g * C,
  b * A + e * B + h * C,
  c * A + f * B + i * C,

  a * D + d * E + g * F,
  b * D + e * E + h * F,
  c * D + f * E + i * F,

  a * G + d * H + g * I,
  b * G + e * H + h * I,
  c * G + f * H + i * I,
];

export const multiply = (...elements) =>
  elements.slice(1).reduce((prev, next) => mult(prev, next), elements[0]);

/**
 * mvMultiply
 *
 * Multiplies a matrix and a vector
 *
 *
 *                          A
 *                          B
 *                          C
 *
 *         a    d    g      .
 *         b    e    h      .
 *         c    f    i      c * A + f * B + i * C
 *
 */
export const mvMultiply = ([a, b, c, d, e, f, g, h, i], [A, B, C]) => [
  a * A + d * B + g * C,
  b * A + e * B + h * C,
  c * A + f * B + i * C,
];

export const normalize = ([A, B, C]) => (C === 1 ? [A, B, C] : [A / C, B / C, 1]);

export const add = ([a, b, c, d, e, f, g, h, i], [A, B, C, D, E, F, G, H, I]) => [
  a + A,
  b + B,
  c + C,
  d + D,
  e + E,
  f + F,
  g + G,
  h + H,
  i + I,
];

export const subtract = ([a, b, c, d, e, f, g, h, i], [A, B, C, D, E, F, G, H, I]) => [
  a - A,
  b - B,
  c - C,
  d - D,
  e - E,
  f - F,
  g - G,
  h - H,
  i - I,
];

/**
 *
 * componentProduct
 *
 */
export const componentProduct = ([a, b, c], [A, B, C]) => [a * A, b * B, c * C];
