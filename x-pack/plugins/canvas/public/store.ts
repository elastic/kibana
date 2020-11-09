/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  createStore as createReduxStore,
  destroyStore as destroy,
  getStore,
  cloneStore,
  // @ts-expect-error untyped local
} from './state/store';
// @ts-expect-error untyped local
import { getInitialState } from './state/initial_state';

import { CoreSetup } from '../../../../src/core/public';
import { API_ROUTE_FUNCTIONS } from '../common/lib/constants';
import { CanvasSetupDeps } from './plugin';

export async function createStore(core: CoreSetup, plugins: CanvasSetupDeps) {
  if (getStore()) {
    return cloneStore();
  }

  return createFreshStore(core, plugins);
}

export async function createFreshStore(core: CoreSetup, plugins: CanvasSetupDeps) {
  const initialState = getInitialState();

  const basePath = core.http.basePath.get();

  // Retrieve server functions
  const serverFunctionsResponse = await core.http.get(API_ROUTE_FUNCTIONS);
  const serverFunctions = Object.values(serverFunctionsResponse);

  initialState.app = {
    basePath,
    serverFunctions,
    ready: false,
  };

  return createReduxStore(initialState);
}

export function destroyStore() {
  destroy();
}
