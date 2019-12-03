/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Vector2, CameraState } from '../../types';

/**
 * https://en.wikipedia.org/wiki/Orthographic_projection
 *
 */
export const worldToRaster: (state: CameraState) => (worldPosition: Vector2) => Vector2 = state => {
  const renderWidth = state.rasterSize[0];
  const renderHeight = state.rasterSize[1];
  const clippingPlaneRight = renderWidth / 2 / state.scaling[0];
  const clippingPlaneTop = renderHeight / 2 / state.scaling[1];
  const clippingPlaneLeft = -clippingPlaneRight;
  const clippingPlaneBottom = -clippingPlaneTop;

  return ([worldX, worldY]) => {
    const [xNdc, yNdc] = cameraToNdc(
      worldX + state.panningOffset[0],
      worldY + state.panningOffset[1],
      clippingPlaneTop,
      clippingPlaneRight,
      clippingPlaneBottom,
      clippingPlaneLeft
    );

    // ndc to raster
    return [(renderWidth * (xNdc + 1)) / 2, (renderHeight * (-yNdc + 1)) / 2];
  };
};

/**
 * Adjust x, y to be bounded, in scale, of a clipping plane defined by top, right, bottom, left
 *
 * See explanation:
 * https://www.scratchapixel.com/lessons/3d-basic-rendering/perspective-and-orthographic-projection-matrix
 */
function cameraToNdc(
  x: number,
  y: number,
  top: number,
  right: number,
  bottom: number,
  left: number
): [number, number] {
  const m11 = 2 / (right - left); // adjust x scale to match ndc (-1, 1) bounds
  const m41 = -((right + left) / (right - left));

  const m22 = 2 / (top - bottom); // adjust y scale to match ndc (-1, 1) bounds
  const m42 = -((top + bottom) / (top - bottom));

  const xPrime = x * m11 + m41;
  const yPrime = y * m22 + m42;

  return [xPrime, yPrime];
}
