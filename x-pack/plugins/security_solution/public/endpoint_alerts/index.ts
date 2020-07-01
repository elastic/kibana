/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Reducer } from 'redux';
import { SecuritySubPluginWithStore } from '../app/types';
import { EndpointAlertsRoutes } from './routes';
import { alertListReducer } from './store/reducer';
import { AlertListState } from '../../common/endpoint_alerts/types';
import { alertMiddlewareFactory } from './store/middleware';
import { substateMiddlewareFactory } from '../common/store';
import { CoreStart } from '../../../../../src/core/public';
import { StartPlugins } from '../types';
import { AppAction } from '../common/store/actions';

/**
 * Internally, our state is sometimes immutable, ignore that in our external
 * interface.
 */
export interface EndpointAlertsPluginState {
  alertList: AlertListState;
}

/**
 * Internally, we use `ImmutableReducer`, but we present a regular reducer
 * externally for compatibility w/ regular redux.
 */
export interface EndpointAlertsPluginReducer {
  alertList: Reducer<AlertListState, AppAction>;
}

export class EndpointAlerts {
  public setup() {}

  public start(
    core: CoreStart,
    plugins: StartPlugins
  ): SecuritySubPluginWithStore<'alertList', AlertListState> {
    const { data, ingestManager } = plugins;
    const middleware = [
      substateMiddlewareFactory<AlertListState>(
        (globalState) => globalState.alertList,
        alertMiddlewareFactory(core, { data, ingestManager })
      ),
    ];

    return {
      SubPluginRoutes: EndpointAlertsRoutes,
      store: {
        initialState: { alertList: undefined },
        /**
         * Cast the ImmutableReducer to a regular reducer for compatibility with
         * the subplugin architecture (which expects plain redux reducers.)
         */
        reducer: { alertList: alertListReducer } as EndpointAlertsPluginReducer,
        middleware,
      },
    };
  }
}
