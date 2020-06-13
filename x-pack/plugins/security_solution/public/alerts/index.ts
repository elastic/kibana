/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Storage } from '../../../../../src/plugins/kibana_utils/public';
import { getTimelinesInStorageByIds } from '../timelines/containers/local_storage';
import { TimelineId } from '../timelines/containers/local_storage/types';
import { getAlertsRoutes } from './routes';
import { SecuritySubPlugin } from '../app/types';
import { ALERTS_RULES_DETAILS_PAGE_TIMELINE_ID, ALERTS_TIMELINE_ID } from './constants';

const ALERTS_TIMELINE_IDS: TimelineId[] = [
  ALERTS_RULES_DETAILS_PAGE_TIMELINE_ID,
  ALERTS_TIMELINE_ID,
];

export class Alerts {
  public setup() {}

  public start(storage: Storage): SecuritySubPlugin {
    return {
      routes: getAlertsRoutes(),
      storageTimelines: {
        timelineById: getTimelinesInStorageByIds(storage, ALERTS_TIMELINE_IDS),
      },
    };
  }
}
