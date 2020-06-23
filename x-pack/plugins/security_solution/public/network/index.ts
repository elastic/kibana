/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Storage } from '../../../../../src/plugins/kibana_utils/public';
import { SecuritySubPluginWithStore } from '../app/types';
import { NetworkRoutes } from './routes';
import { initialNetworkState, networkReducer, NetworkState } from './store';
import { TimelineId } from '../../common/types/timeline';
import { getTimelinesInStorageByIds } from '../timelines/containers/local_storage';

export class Network {
  public setup() {}

  public start(storage: Storage): SecuritySubPluginWithStore<'network', NetworkState> {
    return {
      SubPluginRoutes: NetworkRoutes,
      storageTimelines: {
        timelineById: getTimelinesInStorageByIds(storage, [TimelineId.networkPageExternalAlerts]),
      },
      store: {
        initialState: { network: initialNetworkState },
        reducer: { network: networkReducer },
      },
    };
  }
}
