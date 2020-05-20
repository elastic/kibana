/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreStart } from 'kibana/public';
import { managementReducer } from './store';
import { getManagementRoutes } from './routes';
import { StartPlugins } from '../types';

export class Management {
  public setup() {}

  public start(core: CoreStart, plugins: StartPlugins) {
    return {
      routes: getManagementRoutes(),
      store: {
        initialState: {
          management: {},
        },
        reducer: {
          management: managementReducer,
        },
      },
    };
  }
}
