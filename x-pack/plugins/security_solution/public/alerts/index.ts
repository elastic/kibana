/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Storage } from '../../../../../src/plugins/kibana_utils/public';
import { getTimelineInStorageById } from '../timelines/containers/local_storage';
import { TimelineId } from '../timelines/containers/local_storage/types';
import { getAlertsRoutes } from './routes';
import { SecuritySubPlugin } from '../app/types';
import { SINGLE_RULE_ALERTS_TABLE_ID, ALERTS_TABLE_ID } from './constants';

const ALERTS_TIMELINE_IDS: TimelineId[] = [SINGLE_RULE_ALERTS_TABLE_ID, ALERTS_TABLE_ID];

export class Alerts {
  public setup() {}

  public start(storage: Storage): SecuritySubPlugin {
    const alertsTimelines = ALERTS_TIMELINE_IDS.reduce(
      (acc, timelineId) => {
        const timelineModel = getTimelineInStorageById(storage, timelineId);
        if (!timelineModel) {
          return {
            ...acc,
          };
        }

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
      routes: getAlertsRoutes(),
      storageTimelines: alertsTimelines,
    };
  }
}
