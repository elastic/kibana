/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Reducer } from 'redux';
import { userIsPanning, translation, worldToRaster, rasterToWorld } from './selectors';
import { clamp } from '../../lib/math';

import { CameraState, ResolverAction } from '../../types';

function initialState(): CameraState {
  return {
    scaling: [1, 1] as const,
    rasterSize: [0, 0] as const,
    translationNotCountingCurrentPanning: [0, 0] as const,
    panningOrigin: null,
    currentPanningOffset: null,
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
    console.log(
      'scaleX',
      state.scaling[0],
      'scaleY',
      state.scaling[1],
      'newScaleX',
      newScaleX,
      'newScaleY',
      newScaleY
    );
    const stateWithNewScaling: CameraState = {
      ...state,
      scaling: [newScaleX, newScaleY],
    };
    // TODO, test that asserts that this behavior doesn't happen when user is panning
    if (state.latestFocusedWorldCoordinates !== null && userIsPanning(state) === false) {
      const rasterOfLastFocusedWorldCoordinates = worldToRaster(state)(
        state.latestFocusedWorldCoordinates
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

      // if no lastMousePosition, we're good
      // get world coordinates of lastMousePosition using old state
      // get raster coordinates of lastMousue
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
      panningOrigin: action.payload,
      currentPanningOffset: action.payload,
    };
  } else if (action.type === 'userContinuedPanning') {
    if (userIsPanning(state)) {
      return {
        ...state,
        currentPanningOffset: action.payload,
      };
    } else {
      return state;
    }
  } else if (action.type === 'userStoppedPanning') {
    if (userIsPanning(state)) {
      return {
        ...state,
        translationNotCountingCurrentPanning: translation(state),
        panningOrigin: null,
        currentPanningOffset: null,
      };
    } else {
      return state;
    }
  } else if (action.type === 'userCanceledPanning') {
    return {
      ...state,
      panningOrigin: null,
      currentPanningOffset: null,
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
