/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Reducer } from 'redux';
import { applyMatrix3, subtract } from '../../lib/vector2';
import { userIsPanning, translation, projectionMatrix, inverseProjectionMatrix } from './selectors';
import { clamp } from '../../lib/math';

import { CameraState, ResolverAction, Vector2 } from '../../types';
import { scaleToZoom } from './scale_to_zoom';

function initialState(): CameraState {
  return {
    scalingFactor: scaleToZoom(1), // Defaulted to 1 to 1 scale
    rasterSize: [0, 0] as const,
    translationNotCountingCurrentPanning: [0, 0] as const,
    latestFocusedWorldCoordinates: null,
  };
}

export const cameraReducer: Reducer<CameraState, ResolverAction> = (
  state = initialState(),
  action
) => {
  if (action.type === 'userSetZoomLevel') {
    /**
     * Handle the scale being explicitly set, for example by a 'reset zoom' feature, or by a range slider with exact scale values
     */

    return {
      ...state,
      scalingFactor: clamp(action.payload, 0, 1),
    };
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
      scalingFactor: clamp(state.scalingFactor + action.payload, 0, 1),
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
    if (state.latestFocusedWorldCoordinates !== null) {
      const rasterOfLastFocusedWorldCoordinates = applyMatrix3(
        state.latestFocusedWorldCoordinates,
        projectionMatrix(state)
      );
      const matrix = inverseProjectionMatrix(stateWithNewScaling);
      const worldCoordinateThereNow = applyMatrix3(rasterOfLastFocusedWorldCoordinates, matrix);
      const delta = subtract(worldCoordinateThereNow, state.latestFocusedWorldCoordinates);

      return {
        ...stateWithNewScaling,
        translationNotCountingCurrentPanning: [
          stateWithNewScaling.translationNotCountingCurrentPanning[0] + delta[0],
          stateWithNewScaling.translationNotCountingCurrentPanning[1] + delta[1],
        ],
      };
    } else {
      return stateWithNewScaling;
    }
  } else if (action.type === 'userSetPositionOfCamera') {
    /**
     * Handle the case where the position of the camera is explicitly set, for example by a 'back to center' feature.
     */
    return {
      ...state,
      translationNotCountingCurrentPanning: action.payload,
    };
  } else if (action.type === 'userStartedPanning') {
    /**
     * When the user begins panning with a mousedown event we mark the starting position for later comparisons.
     */
    return {
      ...state,
      panning: {
        origin: action.payload,
        currentOffset: action.payload,
      },
    };
  } else if (action.type === 'userStoppedPanning') {
    /**
     * When the user stops panning (by letting up on the mouse) we calculate the new translation of the camera.
     */
    if (userIsPanning(state)) {
      return {
        ...state,
        translationNotCountingCurrentPanning: translation(state),
        panning: undefined,
      };
    } else {
      return state;
    }
  } else if (action.type === 'userClickedPanControl') {
    const panDirection = action.payload;
    /**
     * Delta amount will be in the range of 20 -> 40 depending on the scalingFactor
     */
    const deltaAmount = (1 + state.scalingFactor) * 20;
    let delta: Vector2;
    if (panDirection === 'north') {
      delta = [0, -deltaAmount];
    } else if (panDirection === 'south') {
      delta = [0, deltaAmount];
    } else if (panDirection === 'east') {
      delta = [-deltaAmount, 0];
    } else if (panDirection === 'west') {
      delta = [deltaAmount, 0];
    } else {
      delta = [0, 0];
    }

    return {
      ...state,
      translationNotCountingCurrentPanning: [
        state.translationNotCountingCurrentPanning[0] + delta[0],
        state.translationNotCountingCurrentPanning[1] + delta[1],
      ],
    };
  } else if (action.type === 'userSetRasterSize') {
    /**
     * Handle resizes of the Resolver component. We need to know the size in order to convert between screen
     * and world coordinates.
     */
    return {
      ...state,
      rasterSize: action.payload,
    };
  } else if (action.type === 'userMovedPointer') {
    const stateWithUpdatedPanning = {
      ...state,
      /**
       * If the user is panning, adjust the panning offset
       */
      panning: userIsPanning(state)
        ? {
            origin: state.panning ? state.panning.origin : action.payload,
            currentOffset: action.payload,
          }
        : state.panning,
    };
    return {
      ...stateWithUpdatedPanning,
      /**
       * keep track of the last world coordinates the user moved over.
       * When the scale of the projection matrix changes, we adjust the camera's world transform in order
       * to keep the same point under the pointer.
       * In order to do this, we need to know the position of the mouse when changing the scale.
       */
      latestFocusedWorldCoordinates: applyMatrix3(
        action.payload,
        inverseProjectionMatrix(stateWithUpdatedPanning)
      ),
    };
  } else {
    return state;
  }
};
