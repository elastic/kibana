/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Vector2, CameraState, AABB, Matrix3 } from '../../types';
import { subtract, divide, add, applyMatrix3 } from '../../lib/vector2';
import { multiply, add as addMatrix } from '../../lib/matrix3';
import {
  inverseOrthographicProjection,
  scalingTransformation,
  orthographicProjection,
  translationTransformation,
} from '../../lib/transformation';

interface ClippingPlanes {
  renderWidth: number;
  renderHeight: number;
  clippingPlaneRight: number;
  clippingPlaneTop: number;
  clippingPlaneLeft: number;
  clippingPlaneBottom: number;
}

/**
 * The viewable area in the Resolver map, in world coordinates.
 */
export function viewableBoundingBox(state: CameraState): AABB {
  const { renderWidth, renderHeight } = clippingPlanes(state);
  const matrix = inverseProjectionMatrix(state);
  const bottomLeftCorner: Vector2 = [0, renderHeight];
  const topRightCorner: Vector2 = [renderWidth, 0];
  return {
    minimum: applyMatrix3(bottomLeftCorner, matrix),
    maximum: applyMatrix3(topRightCorner, matrix),
  };
}

/**
 * The 2D clipping planes used for the orthographic projection. See https://en.wikipedia.org/wiki/Orthographic_projection
 */
function clippingPlanes(state: CameraState): ClippingPlanes {
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
 * A matrix that when applied to a Vector2 will convert it from world coordinates to screen coordinates.
 * See https://en.wikipedia.org/wiki/Orthographic_projection
 */
export const projectionMatrix: (state: CameraState) => Matrix3 = state => {
  const {
    renderWidth,
    renderHeight,
    clippingPlaneRight,
    clippingPlaneTop,
    clippingPlaneLeft,
    clippingPlaneBottom,
  } = clippingPlanes(state);

  return multiply(
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
};

/**
 * The camera has a translation value (not counting any current panning.) This is initialized to (0, 0) and
 * updating any time panning ends.
 *
 * When the user is panning, we keep the initial position of the pointer and the current position of the
 * pointer. The difference between these values equals the panning vector.
 *
 * When the user is panning, the translation of the camera is found by adding the panning vector to the
 * translationNotCountingCurrentPanning.
 *
 * We could update the translation as the user moved the mouse but floating point drift (round-off error) could occur.
 */
export function translation(state: CameraState): Vector2 {
  if (state.panning) {
    return add(
      state.translationNotCountingCurrentPanning,
      divide(subtract(state.panning.currentOffset, state.panning.origin), [
        state.scaling[0],
        // Invert `y` since the `.panning` vectors are in screen coordinates and therefore have backwards `y`
        -state.scaling[1],
      ])
    );
  } else {
    return state.translationNotCountingCurrentPanning;
  }
}

/**
 * A matrix that when applied to a Vector2 converts it from screen coordinates to world coordinates.
 * See https://en.wikipedia.org/wiki/Orthographic_projection
 */
export const inverseProjectionMatrix: (state: CameraState) => Matrix3 = state => {
  const {
    renderWidth,
    renderHeight,
    clippingPlaneRight,
    clippingPlaneTop,
    clippingPlaneLeft,
    clippingPlaneBottom,
  } = clippingPlanes(state);

  /* prettier-ignore */
  const screenToNDC = [
    2 / renderWidth,  0,                -1,
    0,                2 / renderHeight, -1,
    0,                0,                0
  ] as const

  const [translationX, translationY] = translation(state);

  return addMatrix(
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
        screenToNDC
      )
    )
  );
};

/**
 * The scale by which world values are scaled when rendered.
 */
export const scale = (state: CameraState): Vector2 => state.scaling;

/**
 * Whether or not the user is current panning the map.
 */
export const userIsPanning = (state: CameraState): boolean => state.panning !== undefined;
