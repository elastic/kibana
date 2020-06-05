/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SecuritySubPluginWithStore } from '../app/types';
import { NetworkRoutes } from './routes';
import { initialNetworkState, networkReducer, NetworkState } from './store';

export class Network {
  public setup() {}

  public start(): SecuritySubPluginWithStore<'network', NetworkState> {
    return {
      SubPluginRoutes: NetworkRoutes,
      store: {
        initialState: { network: initialNetworkState },
        reducer: { network: networkReducer },
      },
    };
  }
}
