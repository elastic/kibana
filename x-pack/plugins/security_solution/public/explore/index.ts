/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Storage } from '@kbn/kibana-utils-plugin/public';
import type { AnyAction, Reducer } from 'redux';
import { TableId } from '@kbn/securitysolution-data-table';
import React from 'react';
import { EXPLORE_PATH, NETWORK_PATH, USERS_PATH, HOSTS_PATH } from '../../common/constants';
import type { HostsState } from './hosts/store';
import type { UsersState } from './users/store';
import type { SecuritySubPluginWithStore } from '../app/types';
import type { NetworkState } from './network/store';
import { initialNetworkState, networkReducer } from './network/store';
import { getDataTablesInStorageByIds } from '../timelines/containers/local_storage';
import { makeUsersReducer, getInitialUsersState } from './users/store';
import { hostsReducer, initialHostsState } from './hosts/store';
import { withSubPluginRouteSuspense } from '../common/components/with_sub_plugin_route_suspense';

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

const loadRoutes = () =>
  import(
    /* webpackChunkName: "sub_plugin-explore" */
    './routes'
  );

const ExploreLandingLazy = React.lazy(() =>
  loadRoutes().then(({ ExploreLanding }) => ({ default: ExploreLanding }))
);
const NetworkRoutesLazy = React.lazy(() =>
  loadRoutes().then(({ NetworkRoutes }) => ({ default: NetworkRoutes }))
);
const UsersRoutesLazy = React.lazy(() =>
  loadRoutes().then(({ UsersRoutes }) => ({ default: UsersRoutes }))
);
const HostsRoutesLazy = React.lazy(() =>
  loadRoutes().then(({ HostsRoutes }) => ({ default: HostsRoutes }))
);

export class Explore {
  public setup() {}

  public start(storage: Storage): SecuritySubPluginWithStore<'explore', ExploreState> {
    return {
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
          users: getInitialUsersState(storage),
          hosts: initialHostsState,
        },
        reducer: { network: networkReducer, users: makeUsersReducer(storage), hosts: hostsReducer },
      },
      routes: [
        {
          path: EXPLORE_PATH,
          exact: true,
          component: withSubPluginRouteSuspense(ExploreLandingLazy),
        },
        {
          path: NETWORK_PATH,
          component: withSubPluginRouteSuspense(NetworkRoutesLazy),
        },
        {
          path: USERS_PATH,
          component: withSubPluginRouteSuspense(UsersRoutesLazy),
        },
        {
          path: HOSTS_PATH,
          component: withSubPluginRouteSuspense(HostsRoutesLazy),
        },
      ],
    };
  }
}
