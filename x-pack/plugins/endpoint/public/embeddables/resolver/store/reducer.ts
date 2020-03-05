/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Reducer, combineReducers } from 'redux';
import { animateProcessIntoView } from './methods';
import { cameraReducer } from './camera/reducer';
import { dataReducer } from './data/reducer';
import { ResolverState, ResolverAction } from '../types';

const concernReducers = combineReducers({
  camera: cameraReducer,
  data: dataReducer,
});

export const resolverReducer: Reducer<ResolverState, ResolverAction> = (state, action) => {
  const nextState = concernReducers(state, action);
  if (action.type === 'userBroughtProcessIntoView') {
    return animateProcessIntoView(nextState, action.payload.time, action.payload.process);
  } else {
    return nextState;
  }
};
