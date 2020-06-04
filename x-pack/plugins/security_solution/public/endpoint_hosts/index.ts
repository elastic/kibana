/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Reducer } from 'redux';
import { SecuritySubPluginWithStore } from '../app/types';
import { endpointHostsRoutes } from './routes';
import { hostListReducer } from './store/reducer';
import { HostState } from './types';
import { hostMiddlewareFactory } from './store/middleware';
import { CoreStart } from '../../../../../src/core/public';
import { StartPlugins } from '../types';
import { substateMiddlewareFactory } from '../common/store';
import { AppAction } from '../common/store/actions';

/**
 * Internally, our state is sometimes immutable, ignore that in our external
 * interface.
 */
export interface EndpointHostsPluginState {
  hostList: HostState;
}

/**
 * Internally, we use `ImmutableReducer`, but we present a regular reducer
 * externally for compatibility w/ regular redux.
 */
export interface EndpointHostsPluginReducer {
  hostList: Reducer<HostState, AppAction>;
}

export class EndpointHosts {
  public setup() {}

  public start(
    core: CoreStart,
    plugins: StartPlugins
  ): SecuritySubPluginWithStore<'hostList', HostState> {
    const { data, ingestManager } = plugins;
    const middleware = [
      substateMiddlewareFactory(
        (globalState) => globalState.hostList,
        hostMiddlewareFactory(core, { data, ingestManager })
      ),
    ];
    return {
      routes: endpointHostsRoutes(),
      store: {
        initialState: { hostList: undefined },
        /**
         * Cast the ImmutableReducer to a regular reducer for compatibility with
         * the subplugin architecture (which expects plain redux reducers.)
         */
        reducer: { hostList: hostListReducer } as EndpointHostsPluginReducer,
        middleware,
      },
    };
  }
}
