/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreStart } from 'kibana/public';
import { managementReducer, getManagementInitialState, managementMiddlewareFactory } from './store';
import { getManagementRoutes } from './routes';
import { StartPlugins } from '../types';
import { MANAGEMENT_STORE_GLOBAL_NAMESPACE } from './common/constants';
import { SecuritySubPluginWithStore } from '../app/types';
import { Immutable } from '../../common/endpoint/types';
import { ManagementState, ManagementStoreGlobalNamespace } from './types';

export { getManagementUrl } from './common/routing';

export class Management {
  public setup() {}

  public start(
    core: CoreStart,
    plugins: StartPlugins
  ): SecuritySubPluginWithStore<ManagementStoreGlobalNamespace, Immutable<ManagementState>> {
    return {
      routes: getManagementRoutes(),
      store: {
        initialState: {
          [MANAGEMENT_STORE_GLOBAL_NAMESPACE]: getManagementInitialState(),
        },
        reducer: {
          [MANAGEMENT_STORE_GLOBAL_NAMESPACE]: managementReducer,
        },
        middleware: managementMiddlewareFactory(core, plugins),
      },
    };
  }
}
