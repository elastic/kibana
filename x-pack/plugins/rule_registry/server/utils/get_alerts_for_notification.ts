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
  EVENT_ACTION,
  ALERT_TIME_RANGE,
  ALERT_MAINTENANCE_WINDOW_IDS,
} from '@kbn/rule-data-utils';

export function getAlertsForNotification(
  timestamp: string,
  flappingSettings: RulesSettingsFlappingProperties,
  alertDelay: number,
  trackedEventsToIndex: any[],
  newEventsToIndex: any[],
  maintenanceWindowIds?: string[]
) {
  const events: any[] = [];
  for (const trackedEvent of [...newEventsToIndex, ...trackedEventsToIndex]) {
    if (trackedEvent.event[ALERT_STATUS] === ALERT_STATUS_ACTIVE) {
      const count = trackedEvent.activeCount || 0;
      trackedEvent.activeCount = count + 1;
      trackedEvent.pendingRecoveredCount = 0;
      if (trackedEvent.activeCount < alertDelay) {
        continue;
      } else {
        if (trackedEvent.activeCount === alertDelay) {
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
    events.push(trackedEvent);
  }
  return events;
}
