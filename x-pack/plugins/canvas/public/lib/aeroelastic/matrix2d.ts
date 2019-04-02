/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { transformMatrix2d, vector2d } from '.';

export const ORIGIN = [0, 0, 1] as vector2d;

export const UNITMATRIX = [1, 0, 0, 0, 1, 0, 0, 0, 1] as transformMatrix2d;

export const translate = (x: number, y: number): transformMatrix2d =>
  [1, 0, 0, 0, 1, 0, x, y, 1] as transformMatrix2d;

export const scale = (x: number, y: number): transformMatrix2d =>
  [x, 0, 0, 0, y, 0, 0, 0, 1] as transformMatrix2d;

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
const mult = (
  [a, b, c, d, e, f, g, h, i]: transformMatrix2d,
  [A, B, C, D, E, F, G, H, I]: transformMatrix2d
): transformMatrix2d =>
  [
    a * A + d * B + g * C,
    b * A + e * B + h * C,
    c * A + f * B + i * C,

    a * D + d * E + g * F,
    b * D + e * E + h * F,
    c * D + f * E + i * F,

    a * G + d * H + g * I,
    b * G + e * H + h * I,
    c * G + f * H + i * I,
  ] as transformMatrix2d;

export const multiply = (
  first: transformMatrix2d,
  ...rest: transformMatrix2d[]
): transformMatrix2d => rest.reduce((prev, next) => mult(prev, next), first);

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
export const mvMultiply = (
  [a, b, c, d, e, f, g, h, i]: transformMatrix2d,
  [A, B, C]: vector2d
): vector2d => [a * A + d * B + g * C, b * A + e * B + h * C, c * A + f * B + i * C] as vector2d;

export const normalize = ([A, B, C]: vector2d): vector2d =>
  C === 1 ? ([A, B, C] as vector2d) : ([A / C, B / C, 1] as vector2d);

export const add = (
  [a, b, c, d, e, f, g, h, i]: transformMatrix2d,
  [A, B, C, D, E, F, G, H, I]: transformMatrix2d
): transformMatrix2d =>
  [a + A, b + B, c + C, d + D, e + E, f + F, g + G, h + H, i + I] as transformMatrix2d;

export const subtract = (
  [a, b, c, d, e, f, g, h, i]: transformMatrix2d,
  [A, B, C, D, E, F, G, H, I]: transformMatrix2d
): transformMatrix2d =>
  [a - A, b - B, c - C, d - D, e - E, f - F, g - G, h - H, i - I] as transformMatrix2d;

export const componentProduct = ([a, b, c]: vector2d, [A, B, C]: vector2d): vector2d =>
  [a * A, b * B, c * C] as vector2d;
