/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Reducer } from 'redux';
import { SecuritySubPluginWithStore } from '../app/types';
import { endpointHostsRoutes } from './routes';
import { initialHostListState, hostListReducer } from './store/reducer';
import { HostState } from './types';
import { hostMiddlewareFactory } from './store/middleware';
import { CoreStart } from '../../../../../src/core/public';
import { StartPlugins } from '../types';
import { substateMiddlewareFactory } from '../common/store';
import { AppAction } from '../common/store/actions';

export interface EndpointHostsPluginReducer {
  hostList: Reducer<HostState, AppAction>;
}

export interface EndpointHostsPluginState {
  hostList: HostState;
}

export class EndpointHosts {
  public setup() {}

  public start(
    core: CoreStart,
    plugins: StartPlugins
  ): SecuritySubPluginWithStore<'hostList', HostState> {
    const { data, ingestManager } = plugins;
    const middleware = [
      substateMiddlewareFactory<HostState>(
        (globalState) => globalState.hostList,
        hostMiddlewareFactory(core, { data, ingestManager })
      ),
    ];
    return {
      routes: endpointHostsRoutes(),
      store: {
        initialState: { hostList: initialHostListState() },
        reducer: { hostList: hostListReducer as Reducer<HostState, AppAction> },
        middleware,
      },
    };
  }
}
