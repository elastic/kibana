/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createStore as createReduxStore, getStore, cloneStore } from './state/store';

// @ts-expect-error Untyped local
import { getInitialState } from './state/initial_state';

import { CoreStart } from '../../../../src/core/public';
import { API_ROUTE_FUNCTIONS } from '../common/lib/constants';
import { ExpressionFunction } from '../types';

export async function createStore(coreStart: CoreStart) {
  if (getStore()) {
    return cloneStore();
  }

  return createFreshStore(coreStart);
}

async function createFreshStore(coreStart: CoreStart) {
  const initialState = getInitialState();

  const basePath = coreStart.http.basePath.get();

  // Retrieve server functions
  const serverFunctionsResponse = await coreStart.http.get(API_ROUTE_FUNCTIONS);
  const serverFunctions = Object.values(serverFunctionsResponse) as ExpressionFunction[];

  initialState.app = {
    basePath,
    serverFunctions,
    ready: false,
  };

  return createReduxStore(initialState);
}
