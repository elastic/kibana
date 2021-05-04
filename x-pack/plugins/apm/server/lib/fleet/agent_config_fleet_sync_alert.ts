/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertsClient } from 'x-pack/plugins/alerting/server';
import { APMPluginStartDependencies } from '../../types';

export async function createApmAgentFleetSyncAlert({
  alertsClient,
}: {
  alertsClient: AlertsClient;
}) {
  return alertsClient?.create({
    data: {
      enabled: true,
      name: 'APM - Agent config fleet sync',
      tags: ['apm'],
      alertTypeId: 'apm.agent_config_fleet_sync',
      consumer: 'apm',
      schedule: { interval: '1m' },
      actions: [],
      params: {},
      throttle: null,
      notifyWhen: null,
    },
  });
}
export async function getApmAgentFleetSyncAlert({
  alertsClient,
}: {
  alertsClient: AlertsClient;
}) {
  const { total, data } = (await alertsClient?.find({
    options: {
      filter: `alert.attributes.alertTypeId: apm.agent_config_fleet_sync`,
    },
  })) ?? { total: 0, data: [] };

  return total === 0 ? null : data[0];
}

export async function runTaskForApmAgentFleetSyncAlert({
  alertsClient,
  taskManagerPluginStart,
}: {
  alertsClient: AlertsClient;
  taskManagerPluginStart: APMPluginStartDependencies['taskManager'];
}) {
  const alert = await getApmAgentFleetSyncAlert({ alertsClient });
  if (!alert) {
    return;
  }
  const { scheduledTaskId } = alert;
  if (!scheduledTaskId) {
    return;
  }
  await taskManagerPluginStart?.runNow(scheduledTaskId);
}
