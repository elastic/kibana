/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineReducers, applyMiddleware, createStore, compose } from 'redux';
import thunk from 'redux-thunk';
import { ui, DEFAULT_MAP_UI_STATE } from './ui';
import { map, DEFAULT_MAP_STATE } from './map'; // eslint-disable-line import/named
import { nonSerializableInstances } from './non_serializable_instances';
import { MAP_DESTROYED } from '../actions';

export const DEFAULT_MAP_STORE_STATE = {
  ui: { ...DEFAULT_MAP_UI_STATE },
  map: { ...DEFAULT_MAP_STATE },
};

export function createMapStore() {
  const enhancers = [applyMiddleware(thunk)];
  const combinedReducers = combineReducers({
    map,
    ui,
    nonSerializableInstances,
  });

  const rootReducer = (state, action) => {
    // Reset store on map destroyed
    if (action.type === MAP_DESTROYED) {
      state = undefined;
    }

    return combinedReducers(state, action);
  };

  const storeConfig = {};
  return createStore(rootReducer, storeConfig, compose(...enhancers));
}
