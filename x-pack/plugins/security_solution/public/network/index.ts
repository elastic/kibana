/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Storage } from '../../../../../src/plugins/kibana_utils/public';
import { SecuritySubPluginWithStore } from '../app/types';
import { getNetworkRoutes } from './routes';
import { initialNetworkState, networkReducer, NetworkState } from './store';
import { getTimelinesInStorageByIds } from '../timelines/containers/local_storage';
import { NETWORK_PAGE_EXTERNAL_EVENTS_TIMELINE_ID } from './constants';

export class Network {
  public setup() {}

  public start(storage: Storage): SecuritySubPluginWithStore<'network', NetworkState> {
    return {
      routes: getNetworkRoutes(),
      storageTimelines: {
        timelineById: getTimelinesInStorageByIds(storage, [
          NETWORK_PAGE_EXTERNAL_EVENTS_TIMELINE_ID,
        ]),
      },
      store: {
        initialState: { network: initialNetworkState },
        reducer: { network: networkReducer },
      },
    };
  }
}
