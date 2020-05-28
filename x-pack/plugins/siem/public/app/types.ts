/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Reducer, AnyAction, Middleware, Dispatch } from 'redux';
import { NavTab } from '../common/components/navigation/types';
import { HostsState } from '../hosts/store';
import { NetworkState } from '../network/store';
import { TimelineState } from '../timelines/store/timeline/types';
import { ImmutableReducer, State } from '../common/store';
import { Immutable } from '../../common/endpoint/types';
import { AlertListState } from '../../common/endpoint_alerts/types';
import { AppAction } from '../common/store/actions';
import { HostState } from '../endpoint_hosts/types';
import { ManagementState } from '../management/types';

export enum SiemPageName {
  overview = 'overview',
  hosts = 'hosts',
  network = 'network',
  detections = 'detections',
  timelines = 'timelines',
  case = 'case',
  management = 'management',
}

export type SiemNavTabKey =
  | SiemPageName.overview
  | SiemPageName.hosts
  | SiemPageName.network
  | SiemPageName.detections
  | SiemPageName.timelines
  | SiemPageName.case
  | SiemPageName.management;

export type SiemNavTab = Record<SiemNavTabKey, NavTab>;

export interface SecuritySubPluginStore<K extends SecuritySubPluginKeyStore, T> {
  initialState: Record<K, T>;
  reducer: Record<K, Reducer<T, AnyAction>>;
  middleware?: Array<Middleware<{}, State, Dispatch<AppAction | Immutable<AppAction>>>>;
}

export interface SecuritySubPlugin {
  routes: React.ReactElement[];
}

type SecuritySubPluginKeyStore =
  | 'hosts'
  | 'network'
  | 'timeline'
  | 'hostList'
  | 'alertList'
  | 'management';
export interface SecuritySubPluginWithStore<K extends SecuritySubPluginKeyStore, T>
  extends SecuritySubPlugin {
  store: SecuritySubPluginStore<K, T>;
}

export interface SecuritySubPlugins extends SecuritySubPlugin {
  store: {
    initialState: {
      hosts: HostsState;
      network: NetworkState;
      timeline: TimelineState;
      alertList: Immutable<AlertListState>;
      hostList: Immutable<HostState>;
      management: ManagementState;
    };
    reducer: {
      hosts: Reducer<HostsState, AnyAction>;
      network: Reducer<NetworkState, AnyAction>;
      timeline: Reducer<TimelineState, AnyAction>;
      alertList: ImmutableReducer<AlertListState, AppAction>;
      hostList: ImmutableReducer<HostState, AppAction>;
      management: ImmutableReducer<ManagementState, AppAction>;
    };
    middlewares: Array<Middleware<{}, State, Dispatch<AppAction | Immutable<AppAction>>>>;
  };
}
