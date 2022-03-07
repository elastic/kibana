/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uptimeAddMonitorLocatorID } from '../../../../observability/public';
import { MONITOR_ADD_ROUTE } from '../../../common/constants';

const formatSearchKey = (key: string, value: string) => `${key}=${value}`;

async function navigate({
  serviceName,
  deviceType,
  monitorType,
  url,
  isElasticAgentMonitor,
}: {
  serviceName?: string;
  deviceType?: string;
  monitorType?: string;
  url: string;
  isElasticAgentMonitor: string;
}) {
  const prefilledParams: string[] = [];

  if (serviceName) prefilledParams.push(formatSearchKey('serviceName', serviceName));
  if (deviceType) prefilledParams.push(formatSearchKey('deviceType', deviceType));
  if (monitorType) prefilledParams.push(formatSearchKey('monitorType', monitorType));
  if (url) prefilledParams.push(formatSearchKey('url', url));
  const searchString = prefilledParams.join('&');

  const path =
    prefilledParams.length === 0 ? MONITOR_ADD_ROUTE : MONITOR_ADD_ROUTE + `?${searchString}`;

  return {
    app: 'uptime',
    path,
    state: {},
  };
}

export const uptimeAddMonitorNavigatorParams = {
  id: uptimeAddMonitorLocatorID,
  getLocation: navigate,
};
