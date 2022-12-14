/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import { ALERT_STATUS, ALERT_STATUS_RECOVERED } from '@kbn/rule-data-utils';

export function trimRecoveredAlerts(
  logger: Logger,
  trackedRecoveredEvents: any[],
  trackedEvents: any[],
  alertLimit: number
) {
  const recoveredAlerts = [
    ...trackedRecoveredEvents.map((e, index) => ({ index, event: e, trackedEvents: false })),
    ...trackedEvents
      .filter(({ event }) => event[ALERT_STATUS] === ALERT_STATUS_RECOVERED)
      .map((e, index) => ({ index, event: e, trackedEvents: true })),
  ];

  if (recoveredAlerts.length > alertLimit) {
    recoveredAlerts.sort((a, b) => {
      return a.event.flappingHistory.length - b.event.flappingHistory.length;
    });

    // Dropping the "early recovered" alerts for now.
    // In #143445 we will want to recover these alerts and set flapping to false
    const earlyRecoveredAlerts = recoveredAlerts.splice(alertLimit * 1);
    logger.warn(
      `Recovered alerts have exceeded the max alert limit: dropping ${
        earlyRecoveredAlerts.length
      } ${earlyRecoveredAlerts.length > 1 ? 'alerts' : 'alert'}.`
    );
    earlyRecoveredAlerts.forEach((alert) => {
      if (alert.trackedEvents) {
        trackedEvents.splice(alert.index, 1);
      } else {
        trackedRecoveredEvents.splice(alert.index, 1);
      }
    });
  }

  return {
    trackedEventsToIndex: trackedEvents,
    trackedRecoveredEventsToIndex: trackedRecoveredEvents,
  };
}
