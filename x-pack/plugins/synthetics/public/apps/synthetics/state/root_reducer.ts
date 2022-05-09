/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { combineReducers } from '@reduxjs/toolkit';

import { uiReducer } from './ui';
import { indexStatusReducer } from './index_status';

export const rootReducer = combineReducers({
  ui: uiReducer,
  indexStatus: indexStatusReducer,
});

export type RooState = ReturnType<typeof rootReducer>;
