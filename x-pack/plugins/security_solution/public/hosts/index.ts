/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Storage } from '../../../../../src/plugins/kibana_utils/public';
import { SecuritySubPluginWithStore } from '../app/types';
import { getHostsRoutes } from './routes';
import { initialHostsState, hostsReducer, HostsState } from './store';
import { TimelineId } from '../timelines/containers/local_storage/types';
import { getTimelineInStorageById } from '../timelines/containers/local_storage';

const HOST_TIMELINE_IDS: TimelineId[] = ['hosts-page-events', 'hosts-page-external-alerts'];

export class Hosts {
  public setup() {}

  public start(storage: Storage): SecuritySubPluginWithStore<'hosts', HostsState> {
    const hostTimelines = HOST_TIMELINE_IDS.reduce(
      (acc, timelineId) => {
        const timelineModel = getTimelineInStorageById(storage, timelineId);
        return {
          ...acc,
          timelineById: {
            ...acc.timelineById,
            [timelineId]: timelineModel,
          },
        };
      },
      { timelineById: {} }
    );

    return {
      routes: getHostsRoutes(),
      storageTimelines: hostTimelines,
      store: {
        initialState: { hosts: initialHostsState },
        reducer: { hosts: hostsReducer },
      },
    };
  }
}
