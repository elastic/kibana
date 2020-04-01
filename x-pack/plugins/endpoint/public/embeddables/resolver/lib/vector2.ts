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
 * Return `[ a[0] * b[0], a[1] * b[1] ]`
 */
export function multiply(a: Vector2, b: Vector2): Vector2 {
  return [a[0] * b[0], a[1] * b[1]];
}

/**
 * Returns a vector which is the result of applying a 2D transformation matrix to the provided vector.
 */
export function applyMatrix3([x, y]: Vector2, [m11, m12, m13, m21, m22, m23]: Matrix3): Vector2 {
  return [x * m11 + y * m12 + m13, x * m21 + y * m22 + m23];
}

/**
 * Returns the distance between two vectors
 */
export function distance(a: Vector2, b: Vector2) {
  const [x1, y1] = a;
  const [x2, y2] = b;
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

/**
 * Returns the angle between two vectors
 */
export function angle(a: Vector2, b: Vector2) {
  const deltaX = b[0] - a[0];
  const deltaY = b[1] - a[1];
  return Math.atan2(deltaY, deltaX);
}

/**
 * Clamp `vector`'s components.
 */
export function clamp([x, y]: Vector2, [minX, minY]: Vector2, [maxX, maxY]: Vector2): Vector2 {
  return [Math.max(minX, Math.min(maxX, x)), Math.max(minY, Math.min(maxY, y))];
}

/**
 * Scale vector by number
 */
export function scale(a: Vector2, n: number): Vector2 {
  return [a[0] * n, a[1] * n];
}

/**
 * Linearly interpolate between `a` and `b`.
 * `t` represents progress and:
 * 0 <= `t` <= 1
 */
export function lerp(a: Vector2, b: Vector2, t: number): Vector2 {
  return add(scale(a, 1 - t), scale(b, t));
}

/**
 * The length of the vector
 */
export function length([x, y]: Vector2): number {
  return Math.sqrt(x * x + y * y);
}
