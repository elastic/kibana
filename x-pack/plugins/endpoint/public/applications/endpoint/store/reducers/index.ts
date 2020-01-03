/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineReducers } from 'redux';
import { appReducer } from './app';

export const endpointAppReducers = combineReducers({
  app: appReducer,
});

// FIXME: why is `ReturnType<typeof endpointAppReducers>` not working?
// export type GlobalState = ReturnType<typeof endpointAppReducers>;

export interface GlobalState {
  app: ReturnType<typeof appReducer>;
}
