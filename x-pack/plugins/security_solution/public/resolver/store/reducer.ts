/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Reducer, combineReducers } from 'redux';
import { animateProcessIntoView } from './methods';
import { cameraReducer } from './camera/reducer';
import { dataReducer } from './data/reducer';
import { uiReducer } from './ui/reducer';
import { ResolverAction } from './actions';
import { ResolverState } from '../types';
import * as selectors from './selectors';

const concernReducers = combineReducers({
  camera: cameraReducer,
  data: dataReducer,
  ui: uiReducer,
});

export const resolverReducer: Reducer<ResolverState, ResolverAction> = (state, action) => {
  const nextState = concernReducers(state, action);
  if (action.type === 'appReceivedNewExternalProperties') {
    console.log('doing it');
    const selectedNode = selectors.selectedNode(nextState);
    const lastSelectedNode = state ? selectors.selectedNode(state) : undefined;
    console.log('selected', selectedNode, 'lastSelectedNode', lastSelectedNode);
    if (selectedNode !== undefined && selectedNode !== lastSelectedNode) {
      console.log('animating');
      return animateProcessIntoView(nextState, action.payload.time, selectedNode);
    } else {
      console.log('not animating');
      return nextState;
    }
  }
  return nextState;
};
