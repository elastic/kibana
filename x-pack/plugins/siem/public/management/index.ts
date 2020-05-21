/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreStart } from 'kibana/public';
import { managementReducer, getManagementInitialState } from './store';
import { getManagementRoutes } from './routes';
import { StartPlugins } from '../types';
import { MANAGEMENT_GLOBAL_STORE_NAMESPACE } from './store/constants';
import { managementMiddlewareFactory } from './store/middleware';

export class Management {
  public setup() {}

  public start(core: CoreStart, plugins: StartPlugins) {
    // wrap the Management middleware so that it is called with only the
    // management state (and not the app global state)

    return {
      routes: getManagementRoutes(),
      store: {
        initialState: {
          [MANAGEMENT_GLOBAL_STORE_NAMESPACE]: getManagementInitialState(),
        },
        reducer: {
          [MANAGEMENT_GLOBAL_STORE_NAMESPACE]: managementReducer,
        },
        middleware: managementMiddlewareFactory(core, plugins),
      },
    };
  }
}
