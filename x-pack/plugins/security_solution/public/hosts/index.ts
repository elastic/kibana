/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Storage } from '../../../../../src/plugins/kibana_utils/public';
import { TimelineIdLiteral, TimelineId } from '../../common/types/timeline';
import { SecuritySubPluginWithStore } from '../app/types';
import { getTimelinesInStorageByIds } from '../timelines/containers/local_storage';
import { routes } from './routes';
import { initialHostsState, hostsReducer, HostsState } from './store';

const HOST_TIMELINE_IDS: TimelineIdLiteral[] = [
  TimelineId.hostsPageEvents,
  TimelineId.hostsPageExternalAlerts,
  TimelineId.hostsPageSessions,
];

export class Hosts {
  public setup() {}

  public start(storage: Storage): SecuritySubPluginWithStore<'hosts', HostsState> {
    return {
      routes,
      storageTimelines: {
        timelineById: getTimelinesInStorageByIds(storage, HOST_TIMELINE_IDS),
      },
      store: {
        initialState: { hosts: initialHostsState },
        reducer: { hosts: hostsReducer },
      },
    };
  }
}
