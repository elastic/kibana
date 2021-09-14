/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Storage } from '../../../../../src/plugins/kibana_utils/public';
import { SecuritySubPluginWithStore } from '../app/types';
import { routes } from './routes';
import { initialUebaState, uebaReducer, uebaModel } from './store';
import { TimelineId } from '../../common/types/timeline';
import { getTimelinesInStorageByIds } from '../timelines/containers/local_storage';

export class Ueba {
  public setup() {}

  public start(storage: Storage): SecuritySubPluginWithStore<'ueba', uebaModel.UebaModel> {
    return {
      routes,
      storageTimelines: {
        timelineById: getTimelinesInStorageByIds(storage, [TimelineId.uebaPageExternalAlerts]),
      },
      store: {
        initialState: { ueba: initialUebaState },
        reducer: { ueba: uebaReducer },
      },
    };
  }
}
