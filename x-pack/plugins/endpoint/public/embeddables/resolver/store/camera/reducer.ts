/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Reducer } from 'redux';
import { applyMatrix3 } from '../../lib/vector2';
import { userIsPanning, translation, projectionMatrix, rasterToWorld } from './selectors';
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
      const worldCoordinateThereNow = rasterToWorld(stateWithNewScaling)(
        rasterOfLastFocusedWorldCoordinates
      );
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
  } else if (action.type === 'userContinuedPanning') {
    // TODO make these offsets be in world coordinates as well
    if (userIsPanning(state)) {
      return {
        // This logic means, if the user calls `userContinuedPanning` without starting panning first, we start automatically basically?
        ...state,
        panning: {
          origin: state.panning ? state.panning.origin : action.payload,
          currentOffset: action.payload,
        },
      };
    } else {
      return state;
    }
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
  } else if (action.type === 'userFocusedOnWorldCoordinates') {
    return {
      ...state,
      latestFocusedWorldCoordinates: action.payload,
    };
  } else {
    return state;
  }
};
