/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Reducer, combineReducers } from 'redux';
import { animatePanning } from './camera/methods';
import { layout } from './selectors';
import { cameraReducer } from './camera/reducer';
import { dataReducer } from './data/reducer';
import { ResolverAction } from './actions';
import { ResolverState, ResolverUIState } from '../types';
import { nodePosition } from '../models/indexed_process_tree/isometric_taxi_layout';

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
      ariaActiveDescendant: action.payload.result.originId,
      selectedNode: action.payload.result.originId,
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
  } else if (action.type === 'userBroughtNodeIntoView') {
    const { nodeID } = action.payload;
    const next: ResolverUIState = {
      ...state,
      // Select the node. NB: Animation is handled in the reducer as well.
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
const animationDuration = 1000;

export const resolverReducer: Reducer<ResolverState, ResolverAction> = (state, action) => {
  const nextState = concernReducers(state, action);
  if (action.type === 'userBroughtNodeIntoView') {
    const position = nodePosition(layout(nextState), action.payload.nodeID);
    if (position) {
      const withAnimation: ResolverState = {
        ...nextState,
        camera: animatePanning(nextState.camera, action.payload.time, position, animationDuration),
      };
      return withAnimation;
    } else {
      return nextState;
    }
  } else {
    return nextState;
  }
};
