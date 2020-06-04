/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SecuritySubPluginWithStore } from '../app/types';
import { getEndpointAlertsRoutes } from './routes';
import { Immutable } from '../../common/endpoint/types';
import { initialAlertListState, alertListReducer } from './store/reducer';
import { AlertListState } from '../../common/endpoint_alerts/types';
import { alertMiddlewareFactory } from './store/middleware';
import { substateMiddlewareFactory } from '../common/store';
import { CoreStart } from '../../../../../src/core/public';
import { StartPlugins } from '../types';

export class EndpointAlerts {
  public setup() {}

  public start(
    core: CoreStart,
    plugins: StartPlugins
  ): SecuritySubPluginWithStore<'alertList', Immutable<AlertListState>> {
    const { data, ingestManager } = plugins;
    const middleware = [
      substateMiddlewareFactory(
        (globalState) => globalState.alertList,
        alertMiddlewareFactory(core, { data, ingestManager })
      ),
    ];

    return {
      routes: getEndpointAlertsRoutes(),
      store: {
        initialState: { alertList: initialAlertListState() },
        reducer: { alertList: alertListReducer },
        middleware,
      },
    };
  }
}
