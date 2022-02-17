/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Reducer,
  AnyAction,
  Middleware,
  Action,
  Store,
  Dispatch,
  StateFromReducersMapObject,
  CombinedState,
} from 'redux';
import { RouteProps } from 'react-router-dom';
import { AppMountParameters } from '../../../../../src/core/public';
import { UsageCollectionSetup } from '../../../../../src/plugins/usage_collection/public';
import { StartServices } from '../types';

/**
 * The React properties used to render `SecurityApp` as well as the `element` to render it into.
 */
export interface RenderAppProps extends AppMountParameters {
  services: StartServices;
  store: Store<State, Action>;
  subPluginRoutes: RouteProps[];
  usageCollection?: UsageCollectionSetup;
}

import { State, SubPluginsInitReducer } from '../common/store';
import { Immutable } from '../../common/endpoint/types';
import { AppAction } from '../common/store/actions';
import { TimelineState } from '../timelines/store/timeline/types';

export { SecurityPageName } from '../../common/constants';

export interface SecuritySubPluginStore<K extends SecuritySubPluginKeyStore, T> {
  initialState: Record<K, T>;
  reducer: Record<K, Reducer<T, AnyAction>>;
  middleware?: Array<Middleware<{}, State, Dispatch<AppAction | Immutable<AppAction>>>>;
}

export type SecuritySubPluginRoutes = RouteProps[];

export interface SecuritySubPlugin {
  routes: SecuritySubPluginRoutes;
  storageTimelines?: Pick<TimelineState, 'timelineById'>;
}

export type SecuritySubPluginKeyStore =
  | 'hosts'
  | 'users'
  | 'network'
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
