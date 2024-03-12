/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RulesSettingsFlappingProperties } from '@kbn/alerting-plugin/common/rules_settings';
import {
  ALERT_END,
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_STATUS_RECOVERED,
  ALERT_START,
  ALERT_DURATION,
  EVENT_ACTION,
  ALERT_TIME_RANGE,
  ALERT_MAINTENANCE_WINDOW_IDS,
  ALERT_CONSECUTIVE_MATCHES,
} from '@kbn/rule-data-utils';

export function getAlertsForNotification(
  flappingSettings: RulesSettingsFlappingProperties,
  alertDelay: number,
  trackedEventsToIndex: any[],
  newEventsToIndex: any[],
  newEventParams: {
    // values used to create a new event
    maintenanceWindowIds?: string[];
    timestamp: string;
  }
) {
  const events: any[] = [];
  for (const trackedEvent of [...newEventsToIndex, ...trackedEventsToIndex]) {
    if (trackedEvent.event[ALERT_STATUS] === ALERT_STATUS_ACTIVE) {
      const count = trackedEvent.activeCount || 0;
      trackedEvent.activeCount = count + 1;
      trackedEvent.pendingRecoveredCount = 0;
      // do not index the event if the number of consecutive
      // active alerts is less than the rule alertDelay threshold
      if (trackedEvent.activeCount < alertDelay) {
        // remove from array of events to index
        continue;
      } else {
        const { timestamp, maintenanceWindowIds } = newEventParams;
        // if the active count is equal to the alertDelay it is considered a new event
        if (trackedEvent.activeCount === alertDelay) {
          // update the event to look like a new event
          trackedEvent.event[ALERT_DURATION] = 0;
          trackedEvent.event[ALERT_START] = timestamp;
          trackedEvent.event[ALERT_TIME_RANGE] = { gte: timestamp };
          trackedEvent.event[EVENT_ACTION] = 'open';
          if (maintenanceWindowIds?.length) {
            trackedEvent.event[ALERT_MAINTENANCE_WINDOW_IDS] = maintenanceWindowIds;
          }
        }
      }
    } else if (trackedEvent.event[ALERT_STATUS] === ALERT_STATUS_RECOVERED) {
      trackedEvent.activeCount = 0;
      if (flappingSettings.enabled) {
        if (trackedEvent.flapping) {
          const count = trackedEvent.pendingRecoveredCount || 0;
          trackedEvent.pendingRecoveredCount = count + 1;
          if (trackedEvent.pendingRecoveredCount < flappingSettings.statusChangeThreshold) {
            trackedEvent.event[ALERT_STATUS] = ALERT_STATUS_ACTIVE;
            trackedEvent.event[EVENT_ACTION] = 'active';
            delete trackedEvent.event[ALERT_END];
          } else {
            trackedEvent.pendingRecoveredCount = 0;
          }
        }
      } else {
        trackedEvent.pendingRecoveredCount = 0;
      }
    }
    trackedEvent.event[ALERT_CONSECUTIVE_MATCHES] = trackedEvent.activeCount;
    events.push(trackedEvent);
  }
  return events;
}
