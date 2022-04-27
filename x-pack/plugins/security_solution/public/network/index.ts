/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Storage } from '@kbn/kibana-utils-plugin/public';
import { SecuritySubPluginWithStore } from '../app/types';
import { routes } from './routes';
import { initialNetworkState, networkReducer, NetworkState } from './store';
import { TimelineId } from '../../common/types/timeline';
import { getTimelinesInStorageByIds } from '../timelines/containers/local_storage';

export class Network {
  public setup() {}

  public start(storage: Storage): SecuritySubPluginWithStore<'network', NetworkState> {
    return {
      routes,
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
