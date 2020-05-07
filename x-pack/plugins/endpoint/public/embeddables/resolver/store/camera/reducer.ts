/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Reducer } from 'redux';
import { unitsPerNudge, nudgeAnimationDuration } from './scaling_constants';
import { animatePanning } from './methods';
import * as vector2 from '../../lib/vector2';
import * as selectors from './selectors';
import { clamp } from '../../lib/math';

import { CameraState, ResolverAction, Vector2 } from '../../types';
import { scaleToZoom } from './scale_to_zoom';

/**
 * Used in tests.
 */
export function cameraInitialState(): CameraState {
  const state: CameraState = {
    scalingFactor: scaleToZoom(1), // Defaulted to 1 to 1 scale
    rasterSize: [0, 0] as const,
    translationNotCountingCurrentPanning: [0, 0] as const,
    latestFocusedWorldCoordinates: null,
    animation: undefined,
    panning: undefined,
  };
  return state;
}

export const cameraReducer: Reducer<CameraState, ResolverAction> = (
  state = cameraInitialState(),
  action
) => {
  if (action.type === 'userSetZoomLevel') {
    /**
     * Handle the scale being explicitly set, for example by a 'reset zoom' feature, or by a range slider with exact scale values
     */

    const nextState: CameraState = {
      ...state,
      scalingFactor: clamp(action.payload, 0, 1),
    };
    return nextState;
  } else if (action.type === 'userClickedZoomIn') {
    return {
      ...state,
      scalingFactor: clamp(state.scalingFactor + 0.1, 0, 1),
    };
  } else if (action.type === 'userClickedZoomOut') {
    return {
      ...state,
      scalingFactor: clamp(state.scalingFactor - 0.1, 0, 1),
    };
  } else if (action.type === 'userZoomed') {
    const stateWithNewScaling: CameraState = {
      ...state,
      scalingFactor: clamp(state.scalingFactor + action.payload.zoomChange, 0, 1),
    };

    /**
     * Zooming fundamentally just changes the scale, but that would always zoom in (or out) around the center of the map. The user might be interested in
     * something else, like a node. If the user has moved their pointer on to the map, we can keep the pointer over the same point in the map by adjusting the
     * panning when we zoom.
     *
     * You can see this in action by moving your pointer over a node that isn't directly in the center of the map and then changing the zoom level. Do it by
     * using CTRL and the mousewheel, or by pinching the trackpad on a Mac. The node will stay under your mouse cursor and other things in the map will get
     * nearer or further from the mouse cursor. This lets you keep your context when changing zoom levels.
     */
    if (
      state.latestFocusedWorldCoordinates !== null &&
      !selectors.isAnimating(state)(action.payload.time)
    ) {
      const rasterOfLastFocusedWorldCoordinates = vector2.applyMatrix3(
        state.latestFocusedWorldCoordinates,
        selectors.projectionMatrix(state)(action.payload.time)
      );
      const newWorldCoordinatesAtLastFocusedPosition = vector2.applyMatrix3(
        rasterOfLastFocusedWorldCoordinates,
        selectors.inverseProjectionMatrix(stateWithNewScaling)(action.payload.time)
      );

      /**
       * The change in world position incurred by changing scale.
       */
      const delta = vector2.subtract(
        newWorldCoordinatesAtLastFocusedPosition,
        state.latestFocusedWorldCoordinates
      );

      /**
       * Adjust for the change in position due to scale.
       */
      const translationNotCountingCurrentPanning: Vector2 = vector2.subtract(
        stateWithNewScaling.translationNotCountingCurrentPanning,
        delta
      );

      const nextState: CameraState = {
        ...stateWithNewScaling,
        translationNotCountingCurrentPanning,
      };

      return nextState;
    } else {
      return stateWithNewScaling;
    }
  } else if (action.type === 'userSetPositionOfCamera') {
    /**
     * Handle the case where the position of the camera is explicitly set, for example by a 'back to center' feature.
     */
    const nextState: CameraState = {
      ...state,
      animation: undefined,
      translationNotCountingCurrentPanning: action.payload,
    };
    return nextState;
  } else if (action.type === 'userStartedPanning') {
    if (selectors.isAnimating(state)(action.payload.time)) {
      return state;
    }
    /**
     * When the user begins panning with a mousedown event we mark the starting position for later comparisons.
     */
    const nextState: CameraState = {
      ...state,
      animation: undefined,
      panning: {
        origin: action.payload.screenCoordinates,
        currentOffset: action.payload.screenCoordinates,
      },
    };
    return nextState;
  } else if (action.type === 'userStoppedPanning') {
    /**
     * When the user stops panning (by letting up on the mouse) we calculate the new translation of the camera.
     */
    const nextState: CameraState = {
      ...state,
      translationNotCountingCurrentPanning: selectors.translation(state)(action.payload.time),
      panning: undefined,
    };
    return nextState;
  } else if (action.type === 'userNudgedCamera') {
    const { direction, time } = action.payload;
    /**
     * Nudge less when zoomed in.
     */
    const nudge = vector2.multiply(
      vector2.divide([unitsPerNudge, unitsPerNudge], selectors.scale(state)(time)),
      direction
    );

    return animatePanning(
      state,
      time,
      vector2.add(state.translationNotCountingCurrentPanning, nudge),
      nudgeAnimationDuration
    );
  } else if (action.type === 'userSetRasterSize') {
    /**
     * Handle resizes of the Resolver component. We need to know the size in order to convert between screen
     * and world coordinates.
     */
    const nextState: CameraState = {
      ...state,
      rasterSize: action.payload,
    };
    return nextState;
  } else if (action.type === 'userMovedPointer') {
    let stateWithUpdatedPanning: CameraState = state;
    if (state.panning) {
      stateWithUpdatedPanning = {
        ...state,
        panning: {
          origin: state.panning.origin,
          currentOffset: action.payload.screenCoordinates,
        },
      };
    }
    const nextState: CameraState = {
      ...stateWithUpdatedPanning,
      /**
       * keep track of the last world coordinates the user moved over.
       * When the scale of the projection matrix changes, we adjust the camera's world transform in order
       * to keep the same point under the pointer.
       * In order to do this, we need to know the position of the mouse when changing the scale.
       */
      latestFocusedWorldCoordinates: vector2.applyMatrix3(
        action.payload.screenCoordinates,
        selectors.inverseProjectionMatrix(stateWithUpdatedPanning)(action.payload.time)
      ),
    };
    return nextState;
  } else {
    return state;
  }
};
