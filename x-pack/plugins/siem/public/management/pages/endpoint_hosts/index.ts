/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreStart } from 'kibana/public';
import { SecuritySubPluginWithStore } from '../../../app/types';
import { getEndpointHostsRoutes } from './routes';
import { initialHostListState, hostListReducer } from './store/reducer';
import { Immutable } from '../../../../common/endpoint/types';
import { HostState } from './types';
import { hostMiddlewareFactory } from './store/middleware';
import { StartPlugins } from '../../../types';
import { substateMiddlewareFactory } from '../../../common/store';

export class EndpointHosts {
  public setup() {}

  public start(
    core: CoreStart,
    plugins: StartPlugins
  ): SecuritySubPluginWithStore<'hostList', Immutable<HostState>> {
    const { data, ingestManager } = plugins;
    const middleware = [
      substateMiddlewareFactory(
        (globalState) => globalState.hostList,
        hostMiddlewareFactory(core, { data, ingestManager })
      ),
    ];
    return {
      routes: getEndpointHostsRoutes(),
      store: {
        initialState: { hostList: initialHostListState() },
        reducer: { hostList: hostListReducer },
        middleware,
      },
    };
  }
}
