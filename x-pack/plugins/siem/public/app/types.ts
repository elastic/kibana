/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Reducer, AnyAction } from 'redux';

import { NavTab } from '../common/components/navigation/types';
import { HostsState } from '../hosts/store';
import { NetworkState } from '../network/store';
import { TimelineState } from '../timelines/store/timeline/types';

export enum SiemPageName {
  overview = 'overview',
  hosts = 'hosts',
  network = 'network',
  detections = 'detections',
  timelines = 'timelines',
  case = 'case',
}

export type SiemNavTabKey =
  | SiemPageName.overview
  | SiemPageName.hosts
  | SiemPageName.network
  | SiemPageName.detections
  | SiemPageName.timelines
  | SiemPageName.case;

export type SiemNavTab = Record<SiemNavTabKey, NavTab>;

export interface SecuritySubPluginStore<K extends SecuritySubPluginKeyStore, T> {
  initialState: Record<K, T>;
  reducer: Record<K, Reducer<T, AnyAction>>;
}

export interface SecuritySubPlugin {
  routes: React.ReactElement[];
}

type SecuritySubPluginKeyStore = 'hosts' | 'network' | 'timeline';
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
    };
    reducer: {
      hosts: Reducer<HostsState, AnyAction>;
      network: Reducer<NetworkState, AnyAction>;
      timeline: Reducer<TimelineState, AnyAction>;
    };
  };
}
