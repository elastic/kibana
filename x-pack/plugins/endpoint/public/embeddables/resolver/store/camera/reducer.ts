/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Reducer } from 'redux';
import { CameraState, ResolverAction } from '../../types';

function initialState() {
  return {
    zoomLevel: 1,
    panningOffset: [0, 0] as const,
    rasterSize: [0, 0] as const,
  };
}

export const cameraReducer: Reducer<CameraState, ResolverAction> = (
  state = initialState(),
  action
) => {
  if (action.type === 'userZoomed') {
    return {
      ...state,
      scaling: action.payload,
    };
  } else if (action.type === 'userPanned') {
    return {
      ...state,
      panningOffset: action.payload,
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
