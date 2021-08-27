/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CasesClientGetAlertsResponse, AlertGet } from './types';
import { CasesClientArgs } from '..';

export const get = async (
  { alertsInfo }: AlertGet,
  clientArgs: CasesClientArgs
): Promise<CasesClientGetAlertsResponse> => {
  const { alertsService, logger } = clientArgs;
  if (alertsInfo.length === 0) {
    return [];
  }

  const alerts = await alertsService.getAlerts({ alertsInfo, logger });
  return alerts ?? [];
};
