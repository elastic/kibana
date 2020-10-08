/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Matrix3 } from '../types';

/**
 * Return a new matrix which is the product of the first and second matrix.
 */
export function multiply(
  [a11, a12, a13, a21, a22, a23, a31, a32, a33]: Matrix3,
  [b11, b12, b13, b21, b22, b23, b31, b32, b33]: Matrix3
): Matrix3 {
  const s11 = a11 * b11 + a12 * b21 + a13 * b31;
  const s12 = a11 * b12 + a12 * b22 + a13 * b32;
  const s13 = a11 * b13 + a12 * b23 + a13 * b33;

  const s21 = a21 * b11 + a22 * b21 + a23 * b31;
  const s22 = a21 * b12 + a22 * b22 + a23 * b32;
  const s23 = a21 * b13 + a22 * b23 + a23 * b33;

  const s31 = a31 * b11 + a32 * b21 + a33 * b31;
  const s32 = a31 * b12 + a32 * b22 + a33 * b32;
  const s33 = a31 * b13 + a32 * b23 + a33 * b33;

  // prettier-ignore
  return [
    s11, s12, s13,
    s21, s22, s23,
    s31, s32, s33,
  ];
}

/**
 * Return a new matrix which is the sum of the two passed in.
 */
export function add(
  [a11, a12, a13, a21, a22, a23, a31, a32, a33]: Matrix3,
  [b11, b12, b13, b21, b22, b23, b31, b32, b33]: Matrix3
): Matrix3 {
  return [
    a11 + b11,
    a12 + b12,
    a13 + b13,

    a21 + b21,
    a22 + b22,
    a23 + b23,

    a31 + b31,
    a32 + b32,
    a33 + b33,
  ];
}
