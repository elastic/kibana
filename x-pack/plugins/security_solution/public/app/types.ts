/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Reducer,
  AnyAction,
  Middleware,
  Action,
  Store,
  Dispatch,
  StateFromReducersMapObject,
  CombinedState,
} from 'redux';
import type { RouteProps } from 'react-router-dom';
import type { AppMountParameters } from '@kbn/core/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import type { TableState } from '@kbn/securitysolution-data-table';
import type { ExploreReducer, ExploreState } from '../explore';
import type { StartServices } from '../types';

/**
 * The React properties used to render `SecurityApp` as well as the `element` to render it into.
 */
export interface RenderAppProps
  extends Omit<AppMountParameters, 'appBasePath' | 'onAppLeave' | 'setHeaderActionMenu'> {
  services: StartServices;
  store: Store<State, Action>;
  subPluginRoutes?: RouteProps[];
  usageCollection?: UsageCollectionSetup;
  children?: React.ReactNode;
}

import type { State, SubPluginsInitReducer } from '../common/store';
import type { Immutable } from '../../common/endpoint/types';
import type { AppAction } from '../common/store/actions';
import type { GroupModel } from '../common/store/grouping';

export { SecurityPageName } from '../../common/constants';

export interface SecuritySubPluginStore<K extends SecuritySubPluginKeyStore, T> {
  initialState: K extends 'explore' ? ExploreState : Record<K, T>;
  reducer: K extends 'explore' ? ExploreReducer : Record<K, Reducer<T, AnyAction>>;
  middleware?: Array<Middleware<{}, State, Dispatch<AppAction | Immutable<AppAction>>>>;
}

export type SecuritySubPluginRoutes = RouteProps[];

export interface SecuritySubPlugin {
  routes: SecuritySubPluginRoutes;
  storageDataTables?: Pick<TableState, 'tableById'>;
  groups?: GroupModel;
  exploreDataTables?: {
    network: Pick<TableState, 'tableById'>;
    hosts: Pick<TableState, 'tableById'>;
    users: Pick<TableState, 'tableById'>;
  };
}

export type SecuritySubPluginKeyStore =
  | 'explore'
  | 'timeline'
  | 'hostList'
  | 'alertList'
  | 'management';

/**
 * Returned by the various 'SecuritySubPlugin' classes from the `start` method.
 */
export interface SecuritySubPluginWithStore<K extends SecuritySubPluginKeyStore, T>
  extends SecuritySubPlugin {
  store: SecuritySubPluginStore<K, T>;
}

export interface SecuritySubPlugins extends SecuritySubPlugin {
  store: {
    initialState: CombinedState<
      StateFromReducersMapObject<
        /** SubPluginsInitReducer, being an interface, will not work in `StateFromReducersMapObject`.
         * Picking its keys does the trick.
         **/
        Pick<SubPluginsInitReducer, keyof SubPluginsInitReducer>
      >
    >;
    reducer: SubPluginsInitReducer;
    middlewares: Array<Middleware<{}, State, Dispatch<AppAction | Immutable<AppAction>>>>;
  };
}
