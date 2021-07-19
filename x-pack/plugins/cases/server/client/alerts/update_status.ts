/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CasesClientArgs } from '..';
import { UpdateAlertRequest } from './types';

interface UpdateAlertsStatusArgs {
  alerts: UpdateAlertRequest[];
}

export const updateStatus = async (
  { alerts }: UpdateAlertsStatusArgs,
  clientArgs: CasesClientArgs
): Promise<void> => {
  const { alertsService, scopedClusterClient, logger } = clientArgs;
  await alertsService.updateAlertsStatus({ alerts, scopedClusterClient, logger });
};
