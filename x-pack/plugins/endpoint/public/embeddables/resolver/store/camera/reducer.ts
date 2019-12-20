/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Reducer } from 'redux';
import { applyMatrix3 } from '../../lib/vector2';
import { userIsPanning, translation, projectionMatrix, inverseProjectionMatrix } from './selectors';
import { clamp } from '../../lib/math';

import { CameraState, ResolverAction } from '../../types';

function initialState(): CameraState {
  return {
    scaling: [1, 1] as const,
    rasterSize: [0, 0] as const,
    translationNotCountingCurrentPanning: [0, 0] as const,
    latestFocusedWorldCoordinates: null,
  };
}

export const cameraReducer: Reducer<CameraState, ResolverAction> = (
  state = initialState(),
  action
) => {
  if (action.type === 'userScaled') {
    const [deltaX, deltaY] = action.payload;
    return {
      ...state,
      scaling: [clamp(deltaX, 0.1, 3), clamp(deltaY, 0.1, 3)],
    };
  } else if (action.type === 'userZoomed') {
    const newScaleX = clamp(state.scaling[0] + action.payload, 0.1, 3);
    const newScaleY = clamp(state.scaling[1] + action.payload, 0.1, 3);
    const stateWithNewScaling: CameraState = {
      ...state,
      scaling: [newScaleX, newScaleY],
    };
    // TODO, test that asserts that this behavior doesn't happen when user is panning
    if (state.latestFocusedWorldCoordinates !== null && userIsPanning(state) === false) {
      const rasterOfLastFocusedWorldCoordinates = applyMatrix3(
        state.latestFocusedWorldCoordinates,
        projectionMatrix(state)
      );
      const matrix = inverseProjectionMatrix(stateWithNewScaling);
      const worldCoordinateThereNow = applyMatrix3(rasterOfLastFocusedWorldCoordinates, matrix);
      const delta = [
        worldCoordinateThereNow[0] - state.latestFocusedWorldCoordinates[0],
        worldCoordinateThereNow[1] - state.latestFocusedWorldCoordinates[1],
      ];

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
  } else if (action.type === 'userSetPanningOffset') {
    return {
      ...state,
      translationNotCountingCurrentPanning: action.payload,
    };
  } else if (action.type === 'userStartedPanning') {
    return {
      ...state,
      panning: {
        origin: action.payload,
        currentOffset: action.payload,
      },
    };
  } else if (action.type === 'userStoppedPanning') {
    if (userIsPanning(state)) {
      return {
        ...state,
        translationNotCountingCurrentPanning: translation(state),
        panning: undefined,
      };
    } else {
      return state;
    }
  } else if (action.type === 'userCanceledPanning') {
    return {
      ...state,
      panning: undefined,
    };
  } else if (action.type === 'userSetRasterSize') {
    return {
      ...state,
      rasterSize: action.payload,
    };
  } else if (action.type === 'userMovedPointer') {
    return {
      ...state,
      /**
       * keep track of the last world coordinates the user moved over.
       * When the scale of the projection matrix changes, we adjust the camera's world transform in order
       * to keep the same point under the pointer.
       * In order to do this, we need to know the position of the mouse when changing the scale.
       */
      latestFocusedWorldCoordinates: applyMatrix3(action.payload, inverseProjectionMatrix(state)),
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
  } else {
    return state;
  }
};
