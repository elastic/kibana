/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector, defaultMemoize } from 'reselect';
import { easing } from 'ts-easing';
import { clamp } from '../../lib/math';
import * as vector2 from '../../lib/vector2';
import { multiply, add as addMatrix } from '../../lib/matrix3';
import {
  inverseOrthographicProjection,
  scalingTransformation,
  orthographicProjection,
  translationTransformation,
} from '../../lib/transformation';
import * as scalingConstants from './scaling_constants';
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

function animationIsActive(animation: CameraAnimationState, time: Date): boolean {
  return animation.startTime.getTime() + animation.duration >= time.getTime();
}

/**
 * The scale by which world values are scaled when rendered.
 */
export const scale: (state: CameraState) => (time: Date) => Vector2 = createSelector(
  state => state.scalingFactor,
  state => state.animation,
  state => {
    /**
     * Calculate the viewableBoundingBox without taking animation into account,
     * otherwise you'd have circular logic since the scale, during animation,
     * depends on viewableBoundingBox and the viewableBoundingBox always depends on
     * scale.
     */
    if (state.animation) {
      return viewableBoundingBox({
        ...state,
        animation: undefined,
      });
    } else {
      return null;
    }
  },
  (scalingFactor, animation, maybeViewableBoundingBox) => time => {
    const scaleNotCountingAnimation = scaleFromScalingFactor(scalingFactor);
    if (animation !== undefined && animationIsActive(animation, time)) {
      /**
       * 0 meaning it just started,
       * 1 meaning it is done.
       */
      // TODO make this a reusable function?
      const animationProgress = clamp(
        (time.getTime() - animation.startTime.getTime()) / animation.duration,
        0,
        1
      );

      /**
       * `t` goes from 0 -> 1 -> 0 at a linear rate as `animationProgress` goes from 0 -> 1
       */
      const t = -Math.abs(2 * animationProgress - 1) + 1;

      const easedValue = easing.inOutCubic(t);

      /**
       * play the animation at double speed, then at double speed in reverse.
       */
      return vector2.lerp(
        scaleNotCountingAnimation,
        vector2.clamp(
          scaleFromScalingFactor(clamp(scalingFactor - 0.1, 0, 1)),
          [scalingConstants.minimum, scalingConstants.minimum],
          [scalingConstants.maximum, scalingConstants.maximum]
        ),
        easedValue
      );
    } else {
      return scaleNotCountingAnimation;
    }
    function scaleFromScalingFactor(factor: number): Vector2 {
      const delta = scalingConstants.maximum - scalingConstants.minimum;
      const value =
        Math.pow(factor, scalingConstants.zoomCurveRate) * delta + scalingConstants.minimum;
      return [value, value];
    }
  }
);

// TODO test that projection matrix doesn't change when simply moving the mouse?

/**
 * The 2D clipping planes used for the orthographic projection. See https://en.wikipedia.org/wiki/Orthographic_projection
 */
export const clippingPlanes: (
  state: CameraState
) => (time: Date) => ClippingPlanes = createSelector(
  state => state.rasterSize,
  scale,
  (rasterSize, scaleAtTime) => (time: Date) => {
    const [scaleX, scaleY] = scaleAtTime(time);
    const renderWidth = rasterSize[0];
    const renderHeight = rasterSize[1];
    const clippingPlaneRight = renderWidth / 2 / scaleX;
    const clippingPlaneTop = renderHeight / 2 / scaleY;

    return {
      renderWidth,
      renderHeight,
      clippingPlaneRight,
      clippingPlaneTop,
      clippingPlaneLeft: -clippingPlaneRight,
      clippingPlaneBottom: -clippingPlaneTop,
    };
  }
);

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
  (panning, translationNotCountingCurrentPanning, scaleAtTime, animation) => {
    return (time: Date) => {
      const [scaleX, scaleY] = scaleAtTime(time);
      // TODO, calculate this inline somehow? or call a version that takes state and is a
      // type predicate?
      if (animation !== undefined && animationIsActive(animation, time)) {
        const delta = vector2.subtract(animation.targetTranslation, animation.initialTranslation);
        const progress = clamp(
          (time.getTime() - animation.startTime.getTime()) / animation.duration,
          0,
          1
        );

        /**
         * play the animation at double speed, then at double speed in reverse.
         */
        // const inOutProgress = -Math.abs(2 * progress - 1) + 1;

        return vector2.add(
          animation.initialTranslation,
          vector2.scale(delta, easing.inOutCubic(progress))
        );
      } else if (panning) {
        const changeInPanningOffset = vector2.subtract(panning.currentOffset, panning.origin);
        /**
         * invert the vector since panning moves the perception of the screen, which is inverse of the
         * translation of the camera. Inverse the `y` axis again, since `y` is inverted between
         * world and screen coordinates.
         */
        const changeInTranslation = vector2.divide(changeInPanningOffset, [-scaleX, scaleY]);
        return vector2.add(translationNotCountingCurrentPanning, changeInTranslation);
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
  (clippingPlanesAtTime, translationAtTime) => {
    return (time: Date) => {
      const {
        renderWidth,
        renderHeight,
        clippingPlaneRight,
        clippingPlaneTop,
        clippingPlaneLeft,
        clippingPlaneBottom,
      } = clippingPlanesAtTime(time);

      // prettier-ignore
      /**
       * Scale by 1/renderSize to put it in range of 0->1
       * Then multiply it by 2 and then subtract 1, putting it
       * in the range of -1 -> 1
       */
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
          0, 0, translationX,
          0, 0, translationY,
          0, 0, 0
        ] as const,
        multiply(
          /**
           * 3. make values in range of clipping planes,
           * so take it from range -1 -> 1 and put it in range of
           * -length/2 -> length/2
           */
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
  (clippingPlanesAtTime, matrixAtTime) => {
    return (time: Date) => {
      const { renderWidth, renderHeight } = clippingPlanesAtTime(time);
      const matrix = matrixAtTime(time);
      const bottomLeftCorner: Vector2 = [0, renderHeight];
      const topRightCorner: Vector2 = [renderWidth, 0];
      return {
        minimum: vector2.applyMatrix3(bottomLeftCorner, matrix),
        maximum: vector2.applyMatrix3(topRightCorner, matrix),
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
  (clippingPlanesAtTime, translationAtTime) => {
    return defaultMemoize((time: Date) => {
      const {
        renderWidth,
        renderHeight,
        clippingPlaneRight,
        clippingPlaneTop,
        clippingPlaneLeft,
        clippingPlaneBottom,
      } = clippingPlanesAtTime(time);
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
              // 1. adjust for camera by subtracting its translation. The closer the camera is to a point, the closer that point
              // should be to the center of the screen.
              translationTransformation(vector2.scale(translationAtTime(time), -1))
            )
          )
        )
      );
    });
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
