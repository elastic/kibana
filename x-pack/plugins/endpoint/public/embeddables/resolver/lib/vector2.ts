/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Vector2, Matrix3 } from '../types';

/**
 * Returns a vector which is the sum of `a` and `b`.
 */
export function add(a: Vector2, b: Vector2): Vector2 {
  return [a[0] + b[0], a[1] + b[1]];
}

/**
 * Returns a vector which is the difference of `a` and `b`.
 */
export function subtract(a: Vector2, b: Vector2): Vector2 {
  return [a[0] - b[0], a[1] - b[1]];
}

/**
 * Returns a vector which is the quotient of `a` and `b`.
 */
export function divide(a: Vector2, b: Vector2): Vector2 {
  return [a[0] / b[0], a[1] / b[1]];
}

/**
 * Returns a vector which is the result of applying a 2D transformation matrix to the provided vector.
 */
export function applyMatrix3([x, y]: Vector2, [m11, m12, m13, m21, m22, m23]: Matrix3): Vector2 {
  return [x * m11 + y * m12 + m13, y * m21 + y * m22 + m23];
}
