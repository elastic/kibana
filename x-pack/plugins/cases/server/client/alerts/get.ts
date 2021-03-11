/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from 'kibana/server';
import { AlertInfo } from '../../common';
import { AlertServiceContract } from '../../services';
import { CasesClientGetAlertsResponse } from './types';

interface GetParams {
  alertsService: AlertServiceContract;
  alertsInfo: AlertInfo[];
  scopedClusterClient: ElasticsearchClient;
  logger: Logger;
}

export const get = async ({
  alertsService,
  alertsInfo,
  scopedClusterClient,
  logger,
}: GetParams): Promise<CasesClientGetAlertsResponse> => {
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
