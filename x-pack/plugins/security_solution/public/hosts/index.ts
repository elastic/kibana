/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SecuritySubPluginWithStore } from '../app/types';
import { getHostsRoutes } from './routes';
import { initialHostsState, hostsReducer, HostsState } from './store';

export class Hosts {
  public setup() {}

  public start(): SecuritySubPluginWithStore<'hosts', HostsState> {
    return {
      routes: getHostsRoutes(),
      store: {
        initialState: { hosts: initialHostsState },
        reducer: { hosts: hostsReducer },
      },
    };
  }
}
