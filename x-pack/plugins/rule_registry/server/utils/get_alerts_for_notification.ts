/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_FLAP_COUNT } from '@kbn/alerting-plugin/server/lib/flapping_utils';
import {
  ALERT_END,
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_STATUS_RECOVERED,
  EVENT_ACTION,
} from '@kbn/rule-data-utils';

export function getAlertsForNotification(trackedEventsToIndex: any[]) {
  return trackedEventsToIndex.map((trackedEvent) => {
    if (trackedEvent.event[ALERT_STATUS] === ALERT_STATUS_ACTIVE) {
      trackedEvent.pendingRecoveredCount = 0;
    } else if (trackedEvent.event[ALERT_STATUS] === ALERT_STATUS_RECOVERED) {
      if (trackedEvent.flapping) {
        const count = trackedEvent.pendingRecoveredCount || 0;
        trackedEvent.pendingRecoveredCount = count + 1;
        if (trackedEvent.pendingRecoveredCount < MAX_FLAP_COUNT) {
          trackedEvent.event[ALERT_STATUS] = ALERT_STATUS_ACTIVE;
          trackedEvent.event[EVENT_ACTION] = 'active';
          delete trackedEvent.event[ALERT_END];
        } else {
          trackedEvent.pendingRecoveredCount = 0;
        }
      }
    }
    return trackedEvent;
  });
}
