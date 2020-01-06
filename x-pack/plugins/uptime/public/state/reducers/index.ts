/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineReducers } from 'redux';
import { monitorReducer } from './monitor';
import { snapshotReducer } from './snapshot';
import { uiReducer } from './ui';

export const rootReducer = combineReducers({
  monitor: monitorReducer,
  snapshot: snapshotReducer,
  ui: uiReducer,
});
