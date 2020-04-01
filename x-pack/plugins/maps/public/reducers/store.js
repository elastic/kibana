/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineReducers, applyMiddleware, createStore, compose } from 'redux';
import thunk from 'redux-thunk';
import { ui } from './ui';
import { map } from './map';
import { nonSerializableInstances } from './non_serializable_instances';

export function createMapStore() {
  const enhancers = [applyMiddleware(thunk)];
  const rootReducer = combineReducers({
    map,
    ui,
    nonSerializableInstances,
  });
  const storeConfig = {};
  return createStore(rootReducer, storeConfig, compose(...enhancers));
}
