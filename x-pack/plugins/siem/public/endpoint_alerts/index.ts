/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Reducer } from 'redux';
import { SecuritySubPluginWithStore } from '../app/types';
import { endpointAlertsRoutes } from './routes';
import { alertListReducer } from './store/reducer';
import { AlertListState } from '../../common/endpoint_alerts/types';
import { alertMiddlewareFactory } from './store/middleware';
import { substateMiddlewareFactory } from '../common/store';
import { CoreStart } from '../../../../../src/core/public';
import { StartPlugins } from '../types';
import { AppAction } from '../common/store/actions';

export interface EndpointAlertsPluginState {
  alertList: AlertListState;
}

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
      routes: endpointAlertsRoutes(),
      store: {
        initialState: { alertList: undefined },
        reducer: { alertList: alertListReducer as Reducer<AlertListState, AppAction> },
        middleware,
      },
    };
  }
}
