/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Matrix3, Vector2 } from '../types';

/**
 * The inverse of `orthographicProjection`.
 */
export function inverseOrthographicProjection(
  top: number,
  right: number,
  bottom: number,
  left: number
): Matrix3 {
  const m11 = (right - left) / 2;
  const m13 = (right + left) / (right - left);

  const m22 = (top - bottom) / 2;
  const m23 = (top + bottom) / (top - bottom);

  return [m11, 0, m13, 0, m22, m23, 0, 0, 0];
}

/**
 * Adjust x, y to be bounded, in scale, of a clipping plane defined by top, right, bottom, left.
 *
 * See explanation:
 * https://www.scratchapixel.com/lessons/3d-basic-rendering/perspective-and-orthographic-projection-matrix
 * https://en.wikipedia.org/wiki/Orthographic_projection
 */
export function orthographicProjection(
  top: number,
  right: number,
  bottom: number,
  left: number
): Matrix3 {
  const m11 = 2 / (right - left); // adjust x scale to match ndc (-1, 1) bounds
  const m13 = -((right + left) / (right - left));

  const m22 = 2 / (top - bottom); // adjust y scale to match ndc (-1, 1) bounds
  const m23 = -((top + bottom) / (top - bottom));

  return [m11, 0, m13, 0, m22, m23, 0, 0, 0];
}

/**
 * Returns a 2D transformation matrix that when applied to a vector will scale the vector by `x` and `y` in their respective axises.
 * See https://en.wikipedia.org/wiki/Scaling_(geometry)#Matrix_representation
 */
export function scalingTransformation([x, y]: Vector2): Matrix3 {
  // prettier-ignore
  return [
    x, 0, 0,
    0, y, 0,
    0, 0, 0
  ]
}

/**
 * Returns a 2D transformation matrix that when applied to a vector will translate by `x` and `y` in their respective axises.
 * See https://en.wikipedia.org/wiki/Translation_(geometry)#Matrix_representation
 */
export function translationTransformation([x, y]: Vector2): Matrix3 {
  // prettier-ignore
  return [
    1, 0, x,
    0, 1, y,
    0, 0, 1
  ]
}
