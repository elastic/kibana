/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector, defaultMemoize } from 'reselect';
import { easing } from 'ts-easing';
import { clamp, lerp } from '../../lib/math';
import * as vector2 from '../../models/vector2';
import { multiply, add as addMatrix } from '../../models/matrix3';
import {
  inverseOrthographicProjection,
  scalingTransformation,
  orthographicProjection,
  translationTransformation,
} from '../../lib/transformation';
import * as scalingConstants from './scaling_constants';
import { Vector2, CameraState, AABB, Matrix3, CameraAnimationState } from '../../types';

interface ClippingPlanes {
  renderWidth: number;
  renderHeight: number;
  clippingPlaneRight: number;
  clippingPlaneTop: number;
  clippingPlaneLeft: number;
  clippingPlaneBottom: number;
}

function animationIsActive(animation: CameraAnimationState, time: number): boolean {
  return animation.startTime + animation.duration >= time;
}

/**
 * The scale by which world values are scaled when rendered.
 *
 * When the camera position (translation) is changed programatically, it may be animated.
 * The duration of the animation is generally fixed for a given type of interaction. This way
 * the user won't have to wait for a variable amount of time to complete their interaction.
 *
 * Since the duration is fixed and the amount that the camera position changes is variable,
 * the speed at which the camera changes is also variable. If the distance the camera will move
 * is very far, the camera will move very fast.
 *
 * When the camera moves fast, elements will move across the screen quickly. These
 * quick moving elements can be distracting to the user. They may also hinder the quality of
 * animation.
 *
 * The speed at which objects move across the screen is dependent on the speed of the camera
 * as well as the scale. If the scale is high, the camera is zoomed in, and so objects move
 * across the screen faster at a given camera speed. Think of looking into a telephoto lense
 * and moving around only a few degrees: many things might pass through your sight.
 *
 * If the scale is low, the camera is zoomed out, objects look further away, and so they move
 * across the screen slower at a given camera speed. Therefore we can control the speed at
 * which objects move across the screen without changing the camera speed. We do this by changing scale.
 *
 * Changing the scale abruptly isn't acceptable because it would be visually jarring. Also, the
 * change in scale should be temporary, and the original scale should be resumed after the animation.
 *
 * In order to change the scale to lower value, and then back, without being jarring to the user,
 * we calculate a temporary target scale and animate to it.
 *
 */
export const scale: (state: CameraState) => (time: number) => Vector2 = createSelector(
  (state) => state.scalingFactor,
  (state) => state.animation,
  (scalingFactor, animation) => {
    const scaleNotCountingAnimation = scaleFromScalingFactor(scalingFactor);
    /**
     * If `animation` is defined, an animation may be in progress when the returned function is called
     */
    if (animation !== undefined) {
      /**
       * The distance the camera will move during the animation is used to determine the camera speed.
       */
      const panningDistance = vector2.distance(
        animation.targetTranslation,
        animation.initialTranslation
      );

      const panningDistanceInPixels = panningDistance * scaleNotCountingAnimation;

      /**
       * The speed at which pixels move across the screen during animation in pixels per millisecond.
       */
      const speed = panningDistanceInPixels / animation.duration;

      /**
       * The speed (in pixels per millisecond) at which an animation is triggered is a constant.
       * If the camera isn't moving very fast, no change in scale is necessary.
       */
      const speedThreshold = 0.4;

      /**
       * Growth in speed beyond the threshold is taken to the power of a constant. This limits the
       * rate of growth of speed.
       */
      const speedGrowthFactor = 0.4;

      /*
       * Limit the rate of growth of speed. If the speed is too great, the animation will be
       * unpleasant and have poor performance.
       *
       *      gnuplot> plot [x=0:10][y=0:3] threshold=0.4, growthFactor=0.4, x < threshold ? x : x ** growthFactor - (threshold ** growthFactor - threshold)
       *
       *
       *     3 +----------------------------------------------------------------------------+
       *       |         target speed         +              +               +              |
       *       |                                                                            |
       *       |                                                                    ******* |
       *       |                                                                            |
       *       |                                                                            |
       *   2.5 |-+                                                                        +-|
       *       |                                                                            |
       *       |                                                                            |
       *       |                                                                          **|
       *       |                                                                   *******  |
       *       |                                                              ******        |
       *     2 |-+                                                      ******            +-|
       *       |                                                   *****                    |
       *       |                                              *****                         |
       *       |                                         *****                              |
       *       |                                    *****                                   |
       *   1.5 |-+                              *****                                     +-|
       *       |                             ****                                           |
       *       |                         ****                                               |
       *       |                      ****                                                  |
       *       |                   ***                                                      |
       *       |                ***                                                         |
       *     1 |-+            **                                                          +-|
       *       |           ***                                                              |
       *       |         ***                                                                |
       *       |        *                                                                   |
       *       |      **                                                                    |
       *       |    **                                                                      |
       *   0.5 |-+  *                                                                     +-|
       *       |  **                                                                        |
       *       | *                                                                          |
       *       | *                                                                          |
       *       | *                                                                          |
       *       |*             +               +              +               +              |
       *     0 +----------------------------------------------------------------------------+
       *       0              2               4              6               8              10
       *                                     camera speed (pixels per ms)
       *
       **/
      const limitedSpeed =
        speed < speedThreshold
          ? speed
          : speed ** speedGrowthFactor - (speedThreshold ** speedGrowthFactor - speedThreshold);

      /**
       * The distance and duration of the animation are independent variables. If the speed was
       * limited, only the scale can change. The lower the scale, the further the camera is
       * away from things, and therefore the slower things move across the screen. Adjust the
       * scale (within its own limits) to match the limited speed.
       *
       * This will cause the camera to zoom out if it would otherwise move too fast.
       */
      const adjustedScale = clamp(
        (limitedSpeed * animation.duration) / panningDistance,
        scalingConstants.minimum,
        scalingConstants.maximum
      );

      return (time) => {
        /**
         * If the animation has completed, return the `scaleNotCountingAnimation`, as
         * the animation always completes with the scale set back at starting value.
         */
        if (animationIsActive(animation, time) === false) {
          return [scaleNotCountingAnimation, scaleNotCountingAnimation];
        } else {
          /**
           *
           *   Animation is defined by a starting time, duration, starting position, and ending position. The amount of time
           *   which has passed since the start time, compared to the duration, defines the progress of the animation.
           *   We represent this process with a number between 0 and 1. As the animation progresses, the value changes from 0
           *   to 1, linearly.
           */
          const x = animationProgress(animation, time);
          /**
           * The change in scale over the duration of the animation should not be linear. It should grow to the target value,
           * then shrink back down to the original value. We adjust the animation progress so that it reaches its peak
           * halfway through the animation and then returns to the beginning value by the end of the animation.
           *
           * We ease the value so that the change from not-animating-at-all to animating-at-full-speed isn't abrupt.
           * See the graph:
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
          const easedInOutAnimationProgress = easing.inOutCubic(-Math.abs(2 * x - 1) + 1);

          /**
           * Linearly interpolate between these, using the bell-shaped easing value
           */
          const lerpedScale = lerp(
            scaleNotCountingAnimation,
            adjustedScale,
            easedInOutAnimationProgress
          );

          /**
           * The scale should be the same in both axes.
           */
          return [lerpedScale, lerpedScale];
        }
      };
    } else {
      /**
       * The scale should be the same in both axes.
       */
      return () => [scaleNotCountingAnimation, scaleNotCountingAnimation];
    }

    /**
     * Interpolate between the minimum and maximum scale,
     * using a curved ratio based on `factor`.
     */
    function scaleFromScalingFactor(factor: number): number {
      return lerp(
        scalingConstants.minimum,
        scalingConstants.maximum,
        Math.pow(factor, scalingConstants.zoomCurveRate)
      );
    }
  }
);

/**
 * The 2D clipping planes used for the orthographic projection. See https://en.wikipedia.org/wiki/Orthographic_projection
 */
export const clippingPlanes: (
  state: CameraState
) => (time: number) => ClippingPlanes = createSelector(
  (state) => state.rasterSize,
  scale,
  (rasterSize, scaleAtTime) => (time: number) => {
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
 * Whether or not the camera is animating, at a given time.
 */
export const isAnimating: (state: CameraState) => (time: number) => boolean = createSelector(
  (state) => state.animation,
  (animation) => (time) => {
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
export const translation: (state: CameraState) => (time: number) => Vector2 = createSelector(
  (state) => state.panning,
  (state) => state.translationNotCountingCurrentPanning,
  scale,
  (state) => state.animation,
  (panning, translationNotCountingCurrentPanning, scaleAtTime, animation) => {
    return (time: number) => {
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
) => (time: number) => Matrix3 = createSelector(
  clippingPlanes,
  translation,
  (clippingPlanesAtTime, translationAtTime) => {
    return (time: number) => {
      const {
        renderWidth,
        renderHeight,
        clippingPlaneRight,
        clippingPlaneTop,
        clippingPlaneLeft,
        clippingPlaneBottom,
      } = clippingPlanesAtTime(time);

      /**
       * 1. Convert from 0<=n<=screenDimension to -1<=n<=1
       *    e.g. for x-axis, divide by renderWidth then multiply by 2 and subtract by one so the value is in range of -1->1
       */
      // prettier-ignore
      const screenToNDC: Matrix3 = [
        renderWidth === 0 ? 0 : 2 / renderWidth, 0, -1,
        0, renderHeight === 0 ? 0 : 2 / renderHeight, -1,
        0, 0, 0
      ];

      /**
       * 2. Invert Y since DOM positioning has inverted Y axis
       */
      const invertY = scalingTransformation([1, -1]);

      const [translationX, translationY] = translationAtTime(time);

      /**
       * 3. Scale values to the clipping plane dimensions.
       */
      const scaleToClippingPlaneDimensions = inverseOrthographicProjection(
        clippingPlaneTop,
        clippingPlaneRight,
        clippingPlaneBottom,
        clippingPlaneLeft
      );

      /**
       * Move the values to accomodate for the perspective of the camera (based on the camera's transform)
       */
      const translateForCamera: Matrix3 = [0, 0, translationX, 0, 0, translationY, 0, 0, 0];

      return addMatrix(
        translateForCamera,
        multiply(scaleToClippingPlaneDimensions, multiply(invertY, screenToNDC))
      );
    };
  }
);

/**
 * The viewable area in the Resolver map, in world coordinates.
 */
export const viewableBoundingBox: (state: CameraState) => (time: number) => AABB = createSelector(
  clippingPlanes,
  inverseProjectionMatrix,
  (clippingPlanesAtTime, matrixAtTime) => {
    return (time: number) => {
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
export const projectionMatrix: (state: CameraState) => (time: number) => Matrix3 = createSelector(
  clippingPlanes,
  translation,
  (clippingPlanesAtTime, translationAtTime) => {
    return defaultMemoize((time: number) => {
      const {
        renderWidth,
        renderHeight,
        clippingPlaneRight,
        clippingPlaneTop,
        clippingPlaneLeft,
        clippingPlaneBottom,
      } = clippingPlanesAtTime(time);

      /**
       * 1. adjust for camera by subtracting its translation. The closer the camera is to a point, the closer that point
       * should be to the center of the screen.
       */
      const adjustForCameraPosition = translationTransformation(
        vector2.scale(translationAtTime(time), -1)
      );

      /**
       * 2. Scale the values based on the dimsension of Resolver on the screen.
       */
      const screenToNDC = orthographicProjection(
        clippingPlaneTop,
        clippingPlaneRight,
        clippingPlaneBottom,
        clippingPlaneLeft
      );

      /**
       * 3. invert y since CSS has inverted y
       */
      const invertY = scalingTransformation([1, -1]);

      /**
       * 3. Convert values from the scale of -1<=n<=1 to 0<=n<=2
       */
      // prettier-ignore
      const fromNDCtoZeroToTwo: Matrix3 = [
        0, 0, 1,
        0, 0, 1,
        0, 0, 0
      ]

      /**
       * 4. convert from 0->2 to 0->rasterDimension by multiplying by rasterDimension/2
       */
      const fromZeroToTwoToRasterDimensions = scalingTransformation([
        renderWidth / 2,
        renderHeight / 2,
      ]);

      return multiply(
        fromZeroToTwoToRasterDimensions,
        addMatrix(
          fromNDCtoZeroToTwo,
          multiply(invertY, multiply(screenToNDC, adjustForCameraPosition))
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
 * Returns a number 0<=n<=1 where:
 * 0 meaning it just started,
 * 1 meaning it is done.
 */
function animationProgress(animation: CameraAnimationState, time: number): number {
  return clamp((time - animation.startTime) / animation.duration, 0, 1);
}
