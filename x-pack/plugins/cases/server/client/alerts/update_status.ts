/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from 'src/core/server';
import { AlertServiceContract } from '../../services';
import { UpdateAlertRequest } from '../types';

interface UpdateAlertsStatusArgs {
  alertsService: AlertServiceContract;
  alerts: UpdateAlertRequest[];
  scopedClusterClient: ElasticsearchClient;
  logger: Logger;
}

export const updateAlertsStatus = async ({
  alertsService,
  alerts,
  scopedClusterClient,
  logger,
}: UpdateAlertsStatusArgs): Promise<void> => {
  await alertsService.updateAlertsStatus({ alerts, scopedClusterClient, logger });
};
