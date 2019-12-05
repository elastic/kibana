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
  orthographicProjection,
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

  const projection = multiply(
    // 5. convert from 0->2 to 0->rasterWidth (or height)
    scalingTransformation([renderWidth / 2, renderHeight / 2]),
    addMatrix(
      // 4. add one to change range from -1->1 to 0->2
      [0, 0, 1, 0, 0, 1, 0, 0, 0],
      multiply(
        // 3. invert y since CSS has inverted y
        scalingTransformation([1, -1]),
        multiply(
          // 2. scale to clipping plane
          orthographicProjection(
            clippingPlaneTop,
            clippingPlaneRight,
            clippingPlaneBottom,
            clippingPlaneLeft
          ),
          // 1. adjust for camera
          translationTransformation(translation(state))
        )
      )
    )
  );

  // TODO this no longer needs to be a function, just a matrix now
  return worldPosition => {
    return applyMatrix3(worldPosition, projection);
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

  // TODO, define screen, raster, and world coordinates

  const [translationX, translationY] = translation(state);

  const projection = addMatrix(
    // 4. Translate for the 'camera'
    // prettier-ignore
    [
      0, 0, -translationX,
      0, 0, -translationY,
      0, 0, 0
    ] as const,
    multiply(
      // 3. make values in range of clipping planes
      inverseOrthographicProjection(
        clippingPlaneTop,
        clippingPlaneRight,
        clippingPlaneBottom,
        clippingPlaneLeft
      ),
      multiply(
        // 2 Invert Y since CSS has inverted y
        scalingTransformation([1, -1]),
        // 1. convert screen coordinates to NDC
        // e.g. for x-axis, divide by renderWidth then multiply by 2 and subtract by one so the value is in range of -1->1
        // prettier-ignore
        [
          2 / renderWidth,  0, -1,
          2 / renderHeight, 0, -1,
          0,                0,  0
        ] as const
      )
    )
  );

  // TODO, this no longer needs to be a function, can just be a matrix
  return rasterPosition => {
    return applyMatrix3(rasterPosition, projection);
  };
};

export const scale = (state: CameraState): Vector2 => state.scaling;

export const userIsPanning = (state: CameraState): state is CameraStateWhenPanning =>
  state.panningOrigin !== null;
