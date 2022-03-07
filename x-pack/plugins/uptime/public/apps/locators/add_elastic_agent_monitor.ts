/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uptimeAddElasticAgentMonitorLocatorID } from '../../../../observability/public';
import { MONITOR_ADD_ELASTIC_AGENT_ROUTE } from '../../../common/constants';

const formatSearchKey = (key: string, value: string) => `${key}=${value}`;

async function navigate({ agentId, monitorName }: { agentId: string; monitorName: string }) {
  const prefilledParams: string[] = [];

  if (agentId) prefilledParams.push(formatSearchKey('elasticAgentId', agentId));
  if (monitorName)
    prefilledParams.push(
      formatSearchKey('monitorName', Buffer.from(monitorName, 'utf8').toString('base64'))
    );
  const searchString = prefilledParams.join('&');

  const path =
    prefilledParams.length === 0
      ? MONITOR_ADD_ELASTIC_AGENT_ROUTE
      : MONITOR_ADD_ELASTIC_AGENT_ROUTE + `?${searchString}`;

  return {
    app: 'uptime',
    path,
    state: {},
  };
}

export const uptimeAddElasticAgentMonitorNavigatorParams = {
  id: uptimeAddElasticAgentMonitorLocatorID,
  getLocation: navigate,
};
