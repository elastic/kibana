/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SecuritySubPluginWithStore } from '../app/types';
import { HostsRoutes } from './routes';
import { initialHostsState, hostsReducer, HostsState } from './store';

export class Hosts {
  public setup() {}

  public start(): SecuritySubPluginWithStore<'hosts', HostsState> {
    return {
      SubPluginRoutes: HostsRoutes,
      store: {
        initialState: { hosts: initialHostsState },
        reducer: { hosts: hostsReducer },
      },
    };
  }
}
