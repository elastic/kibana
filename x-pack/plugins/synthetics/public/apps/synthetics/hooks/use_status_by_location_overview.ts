/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSelector } from 'react-redux';
import { OverviewStatusState } from '../../../../common/runtime_types';
import { selectOverviewStatus } from '../state/overview_status';

export function useStatusByLocationOverview(configId: string, locationName?: string) {
  const { status } = useSelector(selectOverviewStatus);

  return getConfigStatusByLocation(status, configId, locationName);
}

export const getConfigStatusByLocation = (
  status: OverviewStatusState | null,
  configId: string,
  locationName?: string
) => {
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
};
