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
  state => state.rasterSize,
  (scalingFactor, animation, rasterSize) => time => {
    const scaleNotCountingAnimation = scaleFromScalingFactor(scalingFactor);
    if (animation !== undefined && animationIsActive(animation, time)) {
      /**
       *  Since the camera should zoom out, then back in, adjust the animation progress.
       *
       *  gnuplot> plot [x=-0:1][x=0:1.2] eased(t)=t<.5? 4*t**3 : (t-1)*(2*t-2)**2+1, progress(t)=-abs(2*t-1)+1, eased(progress(x))
       *
       *
       *   1.2 +--------------------------------------------------------------------------------------+
       *       |                +                 +                +                 +                |
       *       |          e(t)=t<.5? 4*t**3 : (t-1)*(2*t-2)**2+1, t(x)=-abs(2*x-1)+1, e(t(x)) ******* |
       *       |                                                                                      |
       *       |                                                                                      |
       *       |                                                                                      |
       *     1 |-+                                 ****************                                 +-|
       *       |                                ***                ***                                |
       *       |                               **                    **                               |
       *       |                             **                        **                             |
       *       |                            *                            *                            |
       *       |                           *                              *                           |
       *   0.8 |-+                        *                                *                        +-|
       *       |                         *                                  *                         |
       *       |                        *                                    *                        |
       *       |                        *                                    *                        |
       *       |                        *                                     *                       |
       *   0.6 |-+                     *                                      *                     +-|
       *       |                      *                                        *                      |
       *       |                      *                                         *                     |
       *       |                     *                                          *                     |
       *       |                     *                                           *                    |
       *       |                    *                                            *                    |
       *   0.4 |-+                 *                                              *                 +-|
       *       |                   *                                               *                  |
       *       |                  *                                                *                  |
       *       |                 *                                                  *                 |
       *       |                 *                                                  *                 |
       *       |                *                                                    *                |
       *   0.2 |-+             *                                                      *             +-|
       *       |              *                                                        *              |
       *       |             *                                                          *             |
       *       |           **                                                            **           |
       *       |          *                                                                *          |
       *       |       ***      +                 +                +                 +      ***       |
       *     0 +--------------------------------------------------------------------------------------+
       *       0               0.2               0.4              0.6               0.8               1
       *                                         animation progress
       *
       */
      const x = animationProgress(animation, time);
      const easedInOutAnimationProgress = easing.inOutCubic(-Math.abs(2 * x - 1) + 1);

      /**
       * The distance (in world coordinates) that the camera will move.
       */
      const panningDistance = vector2.distance(
        animation.targetTranslation,
        animation.initialTranslation
      );

      /**
       * When deciding how much to scale out when animating the translation of the camera:
       *   1. Must take into account the magnitude of change in translation. For example, if the user clicks a button to nudge the camera, there should be no scaling animation. However if the user clicks a button
       *   that focuses a node which is very far away, the camera should move out a lot. (why? we should impose a max speed to camera animation, and after that max speed is reached, the scale should be changed?)
       *   Why tho? things on the screen should never appear to move faster than a given speed. Beyond that speed, it becomes confusing or even dizzying. The speed that things move across the screen is defined as:
       *
       *   speed in screen units = distance * scale / animation duration
       *
       *   We should decrease scale in order to keep the speed in screen units below a value.
       *
       *   maxSpeed = distance * adjustedScale / animationDuration
       *   therefore
       *   maxSpeed * animationDuration / distance = adjustedScale
       */
      const distance = vector2.distance(animation.initialTranslation, animation.targetTranslation);

      const nudgeSpeed =
        (scalingConstants.unitsPerNudge * scaleNotCountingAnimation[0]) /
        scalingConstants.nudgeAnimationDuration;

      const speed = (distance * scaleNotCountingAnimation[0]) / animation.duration;

      const maxTargetSpeed = 0.4;

      const adjustedScale = Math.min(
        scaleNotCountingAnimation[0],
        (maxTargetSpeed * animation.duration) / distance
      );

      // Totally made up value???
      const nudgesToMaxZoomOut = 40;

      const changeToScalingFactorDueToAnimation = clamp(
        // Totally made up equation
        Math.max(0, nudgeFactor(animation, scaleNotCountingAnimation) - 1) / nudgesToMaxZoomOut,
        0,
        0.2
      );

      const zoomedOutScale = scaleFromScalingFactor(
        clamp(scalingFactor - changeToScalingFactorDueToAnimation, 0, 1)
      );

      console.log(
        'speed',
        speed,
        'new adjustedScale',
        adjustedScale,
        'actual zoomedOutScale',
        zoomedOutScale,
        'nudgeSpeed',
        nudgeSpeed,
        'distance',
        distance,
        'scaleNotCountingAnimation',
        scaleNotCountingAnimation,
        'animation.duration',
        animation.duration
      );

      /**
       * Linearly interpolate between these, using the bell-shaped easing value
       */
      return vector2.lerp(
        scaleNotCountingAnimation,
        [adjustedScale, adjustedScale],
        easedInOutAnimationProgress
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
      if (animation !== undefined && animationIsActive(animation, time)) {
        return vector2.lerp(
          animation.initialTranslation,
          animation.targetTranslation,
          easing.inOutCubic(animationProgress(animation, time))
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

/**
 * The magnitude of the animation in terms of nudges.
 */
function nudgeFactor(
  animation: CameraAnimationState,
  scaleNotConsideringAnimation: Vector2
): number {
  // TODO assumes that scale is same in both axis
  const lengthOfNudge = vector2.length(
    vector2.divide([0, scalingConstants.unitsPerNudge], scaleNotConsideringAnimation)
  );

  return (
    vector2.length(vector2.subtract(animation.targetTranslation, animation.initialTranslation)) /
    lengthOfNudge
  );
}

/**
 * If the distance between the start and end translation is greater than a 'nudge'.
 */
function animationIsGreaterThanNudge(
  animation: CameraAnimationState,
  scaleNotConsideringAnimation: Vector2
): boolean {
  return (
    vector2.distance(animation.initialTranslation, animation.targetTranslation) >
    vector2.length(
      vector2.divide(
        [scalingConstants.unitsPerNudge, scalingConstants.unitsPerNudge],
        scaleNotConsideringAnimation
      )
    )
  );
}

/**
 * Returns a number 0<=n<=1 where:
 * 0 meaning it just started,
 * 1 meaning it is done.
 */
function animationProgress(animation: CameraAnimationState, time: Date): number {
  return clamp((time.getTime() - animation.startTime.getTime()) / animation.duration, 0, 1);
}
