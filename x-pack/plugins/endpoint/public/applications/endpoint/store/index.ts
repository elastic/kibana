/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createStore } from 'redux';
import { endpointAppReducers } from './reducers';

// FIXME: typing below is not correct - shows GlobaState as an unknown
export type GlobalState = ReturnType<typeof endpointAppReducers>;

export const appStoreFactory = () => {
  const store = createStore(endpointAppReducers);
  return store;
};
