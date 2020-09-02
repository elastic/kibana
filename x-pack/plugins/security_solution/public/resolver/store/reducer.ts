/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Reducer, combineReducers } from 'redux';
import { animateProcessIntoView } from './methods';
import { cameraReducer } from './camera/reducer';
import { dataReducer } from './data/reducer';
import { ResolverAction } from './actions';
import { ResolverState, ResolverUIState } from '../types';
import { uniquePidForProcess } from '../models/process_event';

const uiReducer: Reducer<ResolverUIState, ResolverAction> = (
  state = {
    ariaActiveDescendant: null,
    selectedNode: null,
  },
  action
) => {
  if (action.type === 'serverReturnedResolverData') {
    const next: ResolverUIState = {
      ...state,
      ariaActiveDescendant: action.payload.result.entityID,
      selectedNode: action.payload.result.entityID,
    };
    return next;
  } else if (action.type === 'userFocusedOnResolverNode') {
    const next: ResolverUIState = {
      ...state,
      ariaActiveDescendant: action.payload,
    };
    return next;
  } else if (action.type === 'userSelectedResolverNode') {
    const next: ResolverUIState = {
      ...state,
      selectedNode: action.payload,
    };
    return next;
  } else if (
    action.type === 'userBroughtProcessIntoView' ||
    action.type === 'appDetectedNewIdFromQueryParams'
  ) {
    const nodeID = uniquePidForProcess(action.payload.process);
    const next: ResolverUIState = {
      ...state,
      ariaActiveDescendant: nodeID,
      selectedNode: nodeID,
    };
    return next;
  } else if (action.type === 'appReceivedNewExternalProperties') {
    const next: ResolverUIState = {
      ...state,
      locationSearch: action.payload.locationSearch,
      resolverComponentInstanceID: action.payload.resolverComponentInstanceID,
    };
    return next;
  } else {
    return state;
  }
};

const concernReducers = combineReducers({
  camera: cameraReducer,
  data: dataReducer,
  ui: uiReducer,
});

export const resolverReducer: Reducer<ResolverState, ResolverAction> = (state, action) => {
  const nextState = concernReducers(state, action);
  if (
    action.type === 'userBroughtProcessIntoView' ||
    action.type === 'appDetectedNewIdFromQueryParams'
  ) {
    return animateProcessIntoView(nextState, action.payload.time, action.payload.process);
  } else {
    return nextState;
  }
};
