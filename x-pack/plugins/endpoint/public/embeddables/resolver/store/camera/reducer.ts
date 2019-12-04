/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Reducer } from 'redux';
import { clamp } from '../../lib/math';

import { CameraState, ResolverAction } from '../../types';

function initialState(): CameraState {
  return {
    scaling: [1, 1] as const,
    panningOffset: [0, 0] as const,
    rasterSize: [0, 0] as const,
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
      scaling: [clamp(deltaX, 0.48, 1.2), clamp(deltaY, 0.48, 1.2)],
    };
  } else if (action.type === 'userPanned') {
    return {
      ...state,
      panningOffset: [
        state.panningOffset[0] + action.payload[0],
        state.panningOffset[1] + action.payload[1],
      ],
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
