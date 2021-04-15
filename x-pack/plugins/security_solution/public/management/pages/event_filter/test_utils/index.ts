/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { combineReducers, createStore } from 'redux';

import {
  MANAGEMENT_STORE_GLOBAL_NAMESPACE,
  MANAGEMENT_STORE_EVENT_FILTER_NAMESPACE,
} from '../../../common/constants';

import { eventFilterPageReducer } from '../store/reducer';

export const createGlobalNoMiddlewareStore = () => {
  return createStore(
    combineReducers({
      [MANAGEMENT_STORE_GLOBAL_NAMESPACE]: combineReducers({
        [MANAGEMENT_STORE_EVENT_FILTER_NAMESPACE]: eventFilterPageReducer,
      }),
    })
  );
};
