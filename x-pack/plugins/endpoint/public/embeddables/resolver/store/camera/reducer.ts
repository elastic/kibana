/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Reducer } from 'redux';
import { userIsPanning, translation } from './selectors';
import { clamp } from '../../lib/math';

import { CameraState, ResolverAction } from '../../types';

function initialState(): CameraState {
  return {
    scaling: [1, 1] as const,
    rasterSize: [0, 0] as const,
    translationNotCountingCurrentPanning: [0, 0] as const,
    panningOrigin: null,
    currentPanningOffset: null,
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
    return {
      ...state,
      scaling: [
        clamp(state.scaling[0] + action.payload, 0.1, 3),
        clamp(state.scaling[1] + action.payload, 0.1, 3),
      ],
    };
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
  } else {
    return state;
  }
};
