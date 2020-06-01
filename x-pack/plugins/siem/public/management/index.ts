/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreStart } from 'kibana/public';
import { Reducer } from 'redux';
import { managementRoutes } from './routes';
import { StartPlugins } from '../types';
import { MANAGEMENT_STORE_GLOBAL_NAMESPACE } from './common/constants';
import { SecuritySubPluginWithStore } from '../app/types';
import { ManagementState, managementReducer } from './store/reducer';
import { AppAction } from '../common/store/actions';
import { managementMiddlewareFactory } from './store/middleware';

export { getManagementUrl } from './common/routing';

export interface ManagementPluginState {
  management: ManagementState;
}
export interface ManagementPluginReducer {
  management: Reducer<ManagementState, AppAction>;
}

export class Management {
  public setup() {}

  public start(
    core: CoreStart,
    plugins: StartPlugins
  ): SecuritySubPluginWithStore<'management', ManagementState> {
    return {
      routes: managementRoutes(),
      store: {
        initialState: {
          [MANAGEMENT_STORE_GLOBAL_NAMESPACE]: undefined,
        },
        reducer: {
          [MANAGEMENT_STORE_GLOBAL_NAMESPACE]: managementReducer as Reducer<
            ManagementState,
            AppAction
          >,
        },
        middleware: managementMiddlewareFactory(core, plugins),
      },
    };
  }
}
