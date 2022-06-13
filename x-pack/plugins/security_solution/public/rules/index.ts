/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Storage } from '@kbn/kibana-utils-plugin/public';

import { SecuritySubPlugin } from '../app/types';
import { DETECTIONS_TIMELINE_IDS } from '../detections';
import { getTimelinesInStorageByIds } from '../timelines/containers/local_storage';
import { routes } from './routes';

export class Rules {
  public setup() {}

  public start(storage: Storage): SecuritySubPlugin {
    return {
      storageTimelines: {
        timelineById: getTimelinesInStorageByIds(storage, DETECTIONS_TIMELINE_IDS),
      },
      routes,
    };
  }
}
