/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mean } from 'lodash';
import { IEvent } from '@kbn/event-log-plugin/server';
import { SanitizedRule, AlertSummary, AlertStatus } from '../types';
import { EVENT_LOG_ACTIONS, EVENT_LOG_PROVIDER, LEGACY_EVENT_LOG_ACTIONS } from '../plugin';

const Millis2Nanos = 1000 * 1000;

export interface AlertSummaryFromEventLogParams {
  rule: SanitizedRule<{ bar: boolean }>;
  events: IEvent[];
  executionEvents: IEvent[];
  dateStart: string;
  dateEnd: string;
}

export function alertSummaryFromEventLog(params: AlertSummaryFromEventLogParams): AlertSummary {
  // initialize the  result
  const { rule, events, executionEvents, dateStart, dateEnd } = params;
  const alertSummary: AlertSummary = {
    id: rule.id,
    name: rule.name,
    tags: rule.tags,
    ruleTypeId: rule.alertTypeId,
    consumer: rule.consumer,
    statusStartDate: dateStart,
    statusEndDate: dateEnd,
    status: 'OK',
    muteAll: rule.muteAll,
    throttle: rule.throttle,
    enabled: rule.enabled,
    lastRun: undefined,
    errorMessages: [],
    alerts: {},
    executionDuration: {
      average: 0,
      valuesWithTimestamp: {},
    },
  };

  const alerts = new Map<string, AlertStatus>();
  const eventDurations: number[] = [];
  const eventDurationsWithTimestamp: Record<string, number> = {};

  // loop through the events
  // should be sorted newest to oldest, we want oldest to newest, so reverse
  for (const event of events.reverse()) {
    const timeStamp = event?.['@timestamp'];
    if (timeStamp === undefined) continue;

    const provider = event?.event?.provider;
    if (provider !== EVENT_LOG_PROVIDER) continue;

    const action = event?.event?.action;

    if (action === undefined) continue;

    if (action === EVENT_LOG_ACTIONS.execute) {
      alertSummary.lastRun = timeStamp;

      const errorMessage = event?.error?.message;
      if (errorMessage !== undefined) {
        alertSummary.status = 'Error';
        alertSummary.errorMessages.push({
          date: timeStamp,
          message: errorMessage,
        });
      } else {
        alertSummary.status = 'OK';
      }

      continue;
    }

    const alertId = event?.kibana?.alerting?.instance_id;
    if (alertId === undefined) continue;

    const status = getAlertStatus(alerts, alertId);
    switch (action) {
      case EVENT_LOG_ACTIONS.newInstance:
        status.activeStartDate = timeStamp;
      // intentionally no break here
      case EVENT_LOG_ACTIONS.activeInstance:
        status.status = 'Active';
        status.actionGroupId = event?.kibana?.alerting?.action_group_id;
        status.actionSubgroup = event?.kibana?.alerting?.action_subgroup;
        break;
      case LEGACY_EVENT_LOG_ACTIONS.resolvedInstance:
      case EVENT_LOG_ACTIONS.recoveredInstance:
        status.status = 'OK';
        status.activeStartDate = undefined;
        status.actionGroupId = undefined;
        status.actionSubgroup = undefined;
    }
  }

  for (const event of executionEvents.reverse()) {
    const timeStamp = event?.['@timestamp'];
    if (timeStamp === undefined) continue;
    const action = event?.event?.action;

    if (action === undefined) continue;
    if (action !== EVENT_LOG_ACTIONS.execute) {
      continue;
    }

    if (event?.event?.duration) {
      const eventDirationMillis = event.event.duration / Millis2Nanos;
      eventDurations.push(eventDirationMillis);
      eventDurationsWithTimestamp[event['@timestamp']!] = eventDirationMillis;
    }
  }

  // set the muted status of alerts
  for (const alertId of rule.mutedInstanceIds) {
    getAlertStatus(alerts, alertId).muted = true;
  }

  // convert the alerts map to object form
  const alertIds = Array.from(alerts.keys()).sort();
  for (const alertId of alertIds) {
    alertSummary.alerts[alertId] = alerts.get(alertId)!;
  }

  // set the overall alert status to Active if appropriatea
  if (alertSummary.status !== 'Error') {
    if (Array.from(alerts.values()).some((a) => a.status === 'Active')) {
      alertSummary.status = 'Active';
    }
  }

  alertSummary.errorMessages.sort((a, b) => a.date.localeCompare(b.date));

  if (eventDurations.length > 0) {
    alertSummary.executionDuration = {
      average: Math.round(mean(eventDurations)),
      valuesWithTimestamp: eventDurationsWithTimestamp,
    };
  }

  return alertSummary;
}

// return an alert status object, creating and adding to the map if needed
function getAlertStatus(alerts: Map<string, AlertStatus>, alertId: string): AlertStatus {
  if (alerts.has(alertId)) return alerts.get(alertId)!;

  const status: AlertStatus = {
    status: 'OK',
    muted: false,
    actionGroupId: undefined,
    actionSubgroup: undefined,
    activeStartDate: undefined,
  };
  alerts.set(alertId, status);
  return status;
}
