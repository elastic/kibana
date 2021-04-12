/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Storage } from '../../../../../src/plugins/kibana_utils/public';
import { getTimelinesInStorageByIds } from '../timelines/containers/local_storage';
import { TimelineIdLiteral, TimelineId } from '../../common/types/timeline';
import { AlertsRoutes } from './routes';
import { SecuritySubPlugin } from '../app/types';

const DETECTIONS_TIMELINE_IDS: TimelineIdLiteral[] = [
  TimelineId.detectionsRulesDetailsPage,
  TimelineId.detectionsPage,
];

export class Detections {
  public setup() {}

  public start(storage: Storage): SecuritySubPlugin {
    return {
      SubPluginRoutes: AlertsRoutes,
      storageTimelines: {
        timelineById: getTimelinesInStorageByIds(storage, DETECTIONS_TIMELINE_IDS),
      },
    };
  }
}
