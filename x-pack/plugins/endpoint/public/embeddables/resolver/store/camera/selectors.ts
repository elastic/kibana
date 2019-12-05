/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Vector2, CameraState, CameraStateWhenPanning, AABB } from '../../types';
import { subtract, divide, add, applyMatrix3 } from '../../lib/vector2';
import { multiply, add as addMatrix } from '../../lib/matrix3';
import {
  inverseOrthographicProjection,
  scalingTransformation,
  translationTransformation,
} from '../../lib/transformation';

interface RasterCameraProperties {
  renderWidth: number;
  renderHeight: number;
  clippingPlaneRight: number;
  clippingPlaneTop: number;
  clippingPlaneLeft: number;
  clippingPlaneBottom: number;
}

export function viewableBoundingBox(state: CameraState): AABB {
  const { renderWidth, renderHeight } = rasterCameraProperties(state);
  return {
    minimum: rasterToWorld(state)([0, renderHeight]),
    maximum: rasterToWorld(state)([renderWidth, 0]),
  };
}

function rasterCameraProperties(state: CameraState): RasterCameraProperties {
  const renderWidth = state.rasterSize[0];
  const renderHeight = state.rasterSize[1];
  const clippingPlaneRight = renderWidth / 2 / state.scaling[0];
  const clippingPlaneTop = renderHeight / 2 / state.scaling[1];

  return {
    renderWidth,
    renderHeight,
    clippingPlaneRight,
    clippingPlaneTop,
    clippingPlaneLeft: -clippingPlaneRight,
    clippingPlaneBottom: -clippingPlaneTop,
  };
}

/**
 * https://en.wikipedia.org/wiki/Orthographic_projection
 *
 */
export const worldToRaster: (state: CameraState) => (worldPosition: Vector2) => Vector2 = state => {
  const {
    renderWidth,
    renderHeight,
    clippingPlaneRight,
    clippingPlaneTop,
    clippingPlaneLeft,
    clippingPlaneBottom,
  } = rasterCameraProperties(state);

  return ([worldX, worldY]) => {
    const [translationX, translationY] = translation(state);

    const [xNdc, yNdc] = orthographicProjection(
      worldX + translationX,
      worldY + translationY,
      clippingPlaneTop,
      clippingPlaneRight,
      clippingPlaneBottom,
      clippingPlaneLeft
    );

    // ndc to raster
    return [(renderWidth * (xNdc + 1)) / 2, (renderHeight * (-yNdc + 1)) / 2];
  };
};

export function translation(state: CameraState): Vector2 {
  if (userIsPanning(state)) {
    return add(
      state.translationNotCountingCurrentPanning,
      divide(subtract(state.currentPanningOffset, state.panningOrigin), state.scaling)
    );
  } else {
    return state.translationNotCountingCurrentPanning;
  }
}

export const rasterToWorld: (
  state: CameraState
) => (rasterPosition: Vector2) => Vector2 = state => {
  const {
    renderWidth,
    renderHeight,
    clippingPlaneRight,
    clippingPlaneTop,
    clippingPlaneLeft,
    clippingPlaneBottom,
  } = rasterCameraProperties(state);
  const [translationX, translationY] = translation(state);

  // Translate for the 'camera'
  // prettier-ignore
  const translationMatrix = [
    0, 0, -translationX,
    0, 0, -translationY,
    0, 0, 0
  ] as const;

  // TODO, define screen, raster, and world coordinates

  // Convert a vector in screen space to NDC space
  const screenToNDC = multiply(
    scalingTransformation([1, -1, 1]),
    // prettier-ignore
    [
      2 / renderWidth,  0, -1,
      2 / renderHeight, 0, -1,
      0,                0,  0
    ] as const
  );

  const projection = addMatrix(
    multiply(
      inverseOrthographicProjection(
        clippingPlaneTop,
        clippingPlaneRight,
        clippingPlaneBottom,
        clippingPlaneLeft
      ),
      screenToNDC
    ),
    translationMatrix
  );

  return rasterPosition => {
    return applyMatrix3(rasterPosition, projection);
  };
};

export const scale = (state: CameraState): Vector2 => state.scaling;

export const userIsPanning = (state: CameraState): state is CameraStateWhenPanning =>
  state.panningOrigin !== null;

/**
 * Adjust x, y to be bounded, in scale, of a clipping plane defined by top, right, bottom, left
 *
 * See explanation:
 * https://www.scratchapixel.com/lessons/3d-basic-rendering/perspective-and-orthographic-projection-matrix
 */
function orthographicProjection(
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
