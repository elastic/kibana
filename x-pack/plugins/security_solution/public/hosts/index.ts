/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Storage } from '../../../../../src/plugins/kibana_utils/public';
import { SecuritySubPluginWithStore } from '../app/types';
import { getTimelinesInStorageByIds } from '../timelines/containers/local_storage';
import { TimelineId } from '../timelines/containers/local_storage/types';
import { getHostsRoutes } from './routes';
import { initialHostsState, hostsReducer, HostsState } from './store';
import { EVENTS_TIMELINE_ID, EXTERNAL_ALERTS_TIMELINE_ID } from './constants';

const HOST_TIMELINE_IDS: TimelineId[] = [EVENTS_TIMELINE_ID, EXTERNAL_ALERTS_TIMELINE_ID];

export class Hosts {
  public setup() {}

  public start(storage: Storage): SecuritySubPluginWithStore<'hosts', HostsState> {
    return {
      routes: getHostsRoutes(),
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
