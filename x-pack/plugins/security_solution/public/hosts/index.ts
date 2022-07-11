/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Storage } from '@kbn/kibana-utils-plugin/public';
import type { TimelineIdLiteral } from '../../common/types/timeline';
import { TimelineId } from '../../common/types/timeline';
import type { SecuritySubPluginWithStore } from '../app/types';
import { getTimelinesInStorageByIds } from '../timelines/containers/local_storage';
import { routes } from './routes';
import type { HostsState } from './store';
import { initialHostsState, hostsReducer } from './store';

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
