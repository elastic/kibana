/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertInstanceContext, AlertInstanceState } from '@kbn/alerting-plugin/common';
import { PublicAlertFactory } from '@kbn/alerting-plugin/server/alert/create_alert_factory';
import { ALERT_STATUS, ALERT_STATUS_RECOVERED } from '@kbn/rule-data-utils';

export function trimRecoveredAlerts<
  InstanceState extends AlertInstanceState = never,
  InstanceContext extends AlertInstanceContext = never,
  ActionGroupIds extends string = never
>(
  trackedRecoveredEvents: any[],
  trackedEvents: any[],
  alertFactory: PublicAlertFactory<InstanceState, InstanceContext, ActionGroupIds>
) {
  const recoveredAlerts = [
    ...trackedRecoveredEvents.map((e, index) => ({
      index,
      flappingHistory: e.flappingHistory,
      trackedEvents: false,
    })),
    ...trackedEvents
      .filter(({ event }) => event[ALERT_STATUS] === ALERT_STATUS_RECOVERED)
      .map((e, index) => ({ index, flappingHistory: e.flappingHistory, trackedEvents: true })),
  ];

  const earlyRecoveredAlerts = alertFactory.alertLimit.getEarlyRecoveredAlerts(recoveredAlerts);
  // Dropping the "early recovered" alerts for now.
  // In #143445 we will want to recover these alerts and set flapping to false
  earlyRecoveredAlerts.forEach((alert) => {
    if (alert.trackedEvents) {
      trackedEvents.splice(alert.index as number, 1);
    } else {
      trackedRecoveredEvents.splice(alert.index as number, 1);
    }
  });

  return {
    trackedEventsToIndex: trackedEvents,
    trackedRecoveredEventsToIndex: trackedRecoveredEvents,
  };
}
