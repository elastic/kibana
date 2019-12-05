/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Matrix3, Vector3, Vector2 } from '../types';

export function inverseOrthographicProjection(
  top: number,
  right: number,
  bottom: number,
  left: number
): Matrix3 {
  const m11 = (right - left) / 2;
  const m41 = (right + left) / (right - left);

  const m22 = (top - bottom) / 2;
  const m42 = (top + bottom) / (top - bottom);

  return [m11, 0, m41, 0, m22, m42, 0, 0, 0];
}

export function scalingTransformation([x, y, z]: Vector3): Matrix3 {
  // prettier-ignore
  return [
    x, 0, 0,
    0, y, 0,
    0, 0, z
  ]
}

export function translationTransformation([x, y]: Vector2): Matrix3 {
  // prettier-ignore
  return [
    1, 0, x,
    0, 1, y,
    0, 0, 0
  ]
}
