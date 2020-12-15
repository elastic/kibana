/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SanitizedAlert, AlertInstanceSummary, AlertInstanceStatus } from '../types';
import { IEvent } from '../../../event_log/server';
import { EVENT_LOG_ACTIONS, EVENT_LOG_PROVIDER, LEGACY_EVENT_LOG_ACTIONS } from '../plugin';

export interface AlertInstanceSummaryFromEventLogParams {
  alert: SanitizedAlert;
  events: IEvent[];
  dateStart: string;
  dateEnd: string;
}

export function alertInstanceSummaryFromEventLog(
  params: AlertInstanceSummaryFromEventLogParams
): AlertInstanceSummary {
  // initialize the  result
  const { alert, events, dateStart, dateEnd } = params;
  const alertInstanceSummary: AlertInstanceSummary = {
    id: alert.id,
    name: alert.name,
    tags: alert.tags,
    alertTypeId: alert.alertTypeId,
    consumer: alert.consumer,
    statusStartDate: dateStart,
    statusEndDate: dateEnd,
    status: 'OK',
    muteAll: alert.muteAll,
    throttle: alert.throttle,
    enabled: alert.enabled,
    lastRun: undefined,
    errorMessages: [],
    instances: {},
  };

  const instances = new Map<string, AlertInstanceStatus>();

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
      alertInstanceSummary.lastRun = timeStamp;

      const errorMessage = event?.error?.message;
      if (errorMessage !== undefined) {
        alertInstanceSummary.status = 'Error';
        alertInstanceSummary.errorMessages.push({
          date: timeStamp,
          message: errorMessage,
        });
      } else {
        alertInstanceSummary.status = 'OK';
      }

      continue;
    }

    const instanceId = event?.kibana?.alerting?.instance_id;
    if (instanceId === undefined) continue;

    const status = getAlertInstanceStatus(instances, instanceId);
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

  // set the muted status of instances
  for (const instanceId of alert.mutedInstanceIds) {
    getAlertInstanceStatus(instances, instanceId).muted = true;
  }

  // convert the instances map to object form
  const instanceIds = Array.from(instances.keys()).sort();
  for (const instanceId of instanceIds) {
    alertInstanceSummary.instances[instanceId] = instances.get(instanceId)!;
  }

  // set the overall alert status to Active if appropriate
  if (alertInstanceSummary.status !== 'Error') {
    if (Array.from(instances.values()).some((instance) => instance.status === 'Active')) {
      alertInstanceSummary.status = 'Active';
    }
  }

  alertInstanceSummary.errorMessages.sort((a, b) => a.date.localeCompare(b.date));

  return alertInstanceSummary;
}

// return an instance status object, creating and adding to the map if needed
function getAlertInstanceStatus(
  instances: Map<string, AlertInstanceStatus>,
  instanceId: string
): AlertInstanceStatus {
  if (instances.has(instanceId)) return instances.get(instanceId)!;

  const status: AlertInstanceStatus = {
    status: 'OK',
    muted: false,
    actionGroupId: undefined,
    actionSubgroup: undefined,
    activeStartDate: undefined,
  };
  instances.set(instanceId, status);
  return status;
}
