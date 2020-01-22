/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector, defaultMemoize } from 'reselect';
import { subtract, divide, add, applyMatrix3 } from '../../lib/vector2';
import { multiply, add as addMatrix } from '../../lib/matrix3';
import {
  inverseOrthographicProjection,
  scalingTransformation,
  orthographicProjection,
  translationTransformation,
} from '../../lib/transformation';
import { maximum, minimum, zoomCurveRate } from './scaling_constants';
import { translation as cameraAnimationTranslation } from './animation/methods';
import { active as animationIsActive } from './animation/methods';
import {
  Vector2,
  CameraState,
  AABB,
  Matrix3,
  CameraStateWhenPanning,
  CameraStateWhenNotAnimatingOrPanning,
  CameraAnimationState,
} from '../../types';

interface ClippingPlanes {
  renderWidth: number;
  renderHeight: number;
  clippingPlaneRight: number;
  clippingPlaneTop: number;
  clippingPlaneLeft: number;
  clippingPlaneBottom: number;
}

/**
 * The 2D clipping planes used for the orthographic projection. See https://en.wikipedia.org/wiki/Orthographic_projection
 */
export const clippingPlanes = (state: CameraState): ClippingPlanes => {
  const renderWidth = state.rasterSize[0];
  const renderHeight = state.rasterSize[1];
  const clippingPlaneRight = renderWidth / 2 / scale(state)[0];
  const clippingPlaneTop = renderHeight / 2 / scale(state)[1];

  return {
    renderWidth,
    renderHeight,
    clippingPlaneRight,
    clippingPlaneTop,
    clippingPlaneLeft: -clippingPlaneRight,
    clippingPlaneBottom: -clippingPlaneTop,
  };
};

/**
 * The scale by which world values are scaled when rendered.
 */
export const scale = (state: CameraState): Vector2 => {
  const delta = maximum - minimum;
  const value = Math.pow(state.scalingFactor, zoomCurveRate) * delta + minimum;
  return [value, value];
};

/**
 * TODO update comment, possibly do this differently?
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
export const translationWhenNotAnimating: (
  state: CameraStateWhenPanning | CameraStateWhenNotAnimatingOrPanning
) => Vector2 = (state: CameraState) => translation(state)(new Date(0));

/**
 * Whether or not the camera is animating, at a given time.
 */
export const isAnimating: (state: CameraState) => (time: Date) => boolean = createSelector(
  state => state.animation,
  animation => time => {
    return animation !== undefined && animationIsActive(animation, time);
  }
);

/**
 * The `useCamera` hook uses changes to this referenece to optionally trigger a new rAF loop.
 * TODO delete this
 */
export function animationReference(state: CameraState): CameraAnimationState | undefined {
  return state.animation;
}

// TODO, use this
/*
export const animationEndTime: (state: CameraState) => Date | null = createSelector(
  state => state.animation,
  animation =>
    animation === undefined ? null : new Date(animation.startTime.getTime() + animationDuration)
);
*/

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
export const translation: (state: CameraState) => (time: Date) => Vector2 = createSelector(
  state => state.panning,
  state => state.translationNotCountingCurrentPanning,
  scale,
  state => state.animation,
  (panning, translationNotCountingCurrentPanning, [scaleX, scaleY], animation) => {
    return (time: Date) => {
      // TODO, calculate this inline somehow? or call a version that takes state and is a
      // type predicate?
      if (animation !== undefined && animationIsActive(animation, time)) {
        return cameraAnimationTranslation(animation, time);
      } else if (panning) {
        return add(
          translationNotCountingCurrentPanning,
          divide(subtract(panning.currentOffset, panning.origin), [
            scaleX,
            // Invert `y` since the `.panning` vectors are in screen coordinates and therefore have backwards `y`
            -scaleY,
          ])
        );
      } else {
        return translationNotCountingCurrentPanning;
      }
    };
  }
);

/**
 * A matrix that when applied to a Vector2 converts it from screen coordinates to world coordinates.
 * See https://en.wikipedia.org/wiki/Orthographic_projection
 */
export const inverseProjectionMatrix: (
  state: CameraState
) => (time: Date) => Matrix3 = createSelector(
  clippingPlanes,
  translation,
  (
    {
      renderWidth,
      renderHeight,
      clippingPlaneRight,
      clippingPlaneTop,
      clippingPlaneLeft,
      clippingPlaneBottom,
    },
    translationAtTime
  ) => {
    return (time: Date) => {
      // prettier-ignore
      const screenToNDC = [
        2 / renderWidth, 0, -1,
        0, 2 / renderHeight, -1,
        0, 0, 0
      ] as const;

      const [translationX, translationY] = translationAtTime(time);

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
  }
);

/**
 * The viewable area in the Resolver map, in world coordinates.
 */
export const viewableBoundingBox: (state: CameraState) => (time: Date) => AABB = createSelector(
  clippingPlanes,
  inverseProjectionMatrix,
  ({ renderWidth, renderHeight }, matrixAtTime) => {
    return (time: Date) => {
      const matrix = matrixAtTime(time);
      const bottomLeftCorner: Vector2 = [0, renderHeight];
      const topRightCorner: Vector2 = [renderWidth, 0];
      return {
        minimum: applyMatrix3(bottomLeftCorner, matrix),
        maximum: applyMatrix3(topRightCorner, matrix),
      };
    };
  }
);

/**
 * A matrix that when applied to a Vector2 will convert it from world coordinates to screen coordinates.
 * See https://en.wikipedia.org/wiki/Orthographic_projection
 */
export const projectionMatrix: (state: CameraState) => (time: Date) => Matrix3 = createSelector(
  clippingPlanes,
  translation,
  (
    {
      renderWidth,
      renderHeight,
      clippingPlaneRight,
      clippingPlaneTop,
      clippingPlaneLeft,
      clippingPlaneBottom,
    },
    translationAtTime
  ) => {
    return defaultMemoize((time: Date) =>
      multiply(
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
              translationTransformation(translationAtTime(time))
            )
          )
        )
      )
    );
  }
);

/**
 * Scales the coordinate system, used for zooming. Should always be between 0 and 1
 */
export const scalingFactor = (state: CameraState): CameraState['scalingFactor'] => {
  return state.scalingFactor;
};

/**
 * Whether or not the user is current panning the map.
 */
export const userIsPanning = (state: CameraState): boolean => state.panning !== undefined;
