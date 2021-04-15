/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertInfo } from '../../common';
import { CasesClientGetAlertsResponse } from './types';
import { CasesClientArgs } from '..';

interface GetParams {
  alertsInfo: AlertInfo[];
}

export const get = async (
  { alertsInfo }: GetParams,
  clientArgs: CasesClientArgs
): Promise<CasesClientGetAlertsResponse> => {
  const { alertsService, scopedClusterClient, logger } = clientArgs;
  if (alertsInfo.length === 0) {
    return [];
  }

  const alerts = await alertsService.getAlerts({ alertsInfo, scopedClusterClient, logger });
  if (!alerts) {
    return [];
  }

  return alerts.docs.map((alert) => ({
    id: alert._id,
    index: alert._index,
    ...alert._source,
  }));
};
