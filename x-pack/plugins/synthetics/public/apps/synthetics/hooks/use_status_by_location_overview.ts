/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSelector } from 'react-redux';
import { selectOverviewStatus } from '../state/overview';

export function useStatusByLocationOverview(configId: string, locationName?: string) {
  const { status } = useSelector(selectOverviewStatus);
  if (!locationName || !status) {
    return { status: 'unknown' };
  }
  const allConfigs = status.allConfigs;
  const configIdByLocation = `${configId}-${locationName}`;
  const config = allConfigs[configIdByLocation];

  return {
    configIdByLocation,
    status: config?.status || 'unknown',
    timestamp: config?.timestamp,
    ping: config?.ping,
  };
}
