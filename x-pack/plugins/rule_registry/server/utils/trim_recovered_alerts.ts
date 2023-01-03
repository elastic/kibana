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

  const earlyRecoveredAlertOpts = alertFactory.alertLimit.getEarlyRecoveredAlerts(recoveredAlerts);
  let earlyRecoveredEvents: any[] = [];
  earlyRecoveredAlertOpts.forEach((opts) => {
    let alert;
    if (opts.trackedEvents) {
      alert = trackedEvents.splice(opts.index as number, 1);
    } else {
      alert = trackedRecoveredEvents.splice(opts.index as number, 1);
    }

    alert[0].flapping = false;
    earlyRecoveredEvents = earlyRecoveredEvents.concat(alert);
  });

  return {
    trackedEventsToIndex: trackedEvents,
    trackedRecoveredEventsToIndex: trackedRecoveredEvents,
    earlyRecoveredEvents,
  };
}
