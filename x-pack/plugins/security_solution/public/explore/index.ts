/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Storage } from '@kbn/kibana-utils-plugin/public';
import type { AnyAction, Reducer } from 'redux';
import type { HostsState } from './hosts/store';
import type { UsersState } from './users/store';
import { TableId } from '../../common/types';
import type { SecuritySubPluginWithStore } from '../app/types';
import { routes } from './routes';
import type { NetworkState } from './network/store';
import { initialNetworkState, networkReducer } from './network/store';
import { getDataTablesInStorageByIds } from '../timelines/containers/local_storage';
import { initialUsersState, usersReducer } from './users/store';
import { hostsReducer, initialHostsState } from './hosts/store';

export interface ExploreState {
  network: NetworkState;
  hosts: HostsState;
  users: UsersState;
}

export interface ExploreReducer {
  network: Reducer<NetworkState, AnyAction>;
  hosts: Reducer<HostsState, AnyAction>;
  users: Reducer<UsersState, AnyAction>;
}

export class Explore {
  public setup() {}

  public start(storage: Storage): SecuritySubPluginWithStore<'explore', ExploreState> {
    return {
      routes,
      exploreDataTables: {
        network: { tableById: getDataTablesInStorageByIds(storage, [TableId.networkPageEvents]) },
        hosts: {
          tableById: getDataTablesInStorageByIds(storage, [
            TableId.hostsPageEvents,
            TableId.hostsPageSessions,
          ]),
        },
        users: {
          tableById: getDataTablesInStorageByIds(storage, [TableId.usersPageEvents]),
        },
      },
      store: {
        initialState: {
          network: initialNetworkState,
          users: initialUsersState,
          hosts: initialHostsState,
        },
        reducer: { network: networkReducer, users: usersReducer, hosts: hostsReducer },
      },
    };
  }
}
