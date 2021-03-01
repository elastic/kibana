/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from 'kibana/server';
import { AlertServiceContract } from '../../services';
import { CaseClientGetAlertsResponse } from './types';

interface GetParams {
  alertsService: AlertServiceContract;
  ids: string[];
  indices: Set<string>;
  scopedClusterClient: ElasticsearchClient;
  logger: Logger;
}

export const get = async ({
  alertsService,
  ids,
  indices,
  scopedClusterClient,
  logger,
}: GetParams): Promise<CaseClientGetAlertsResponse> => {
  if (ids.length === 0 || indices.size <= 0) {
    return [];
  }

  const alerts = await alertsService.getAlerts({ ids, indices, scopedClusterClient, logger });
  if (!alerts) {
    return [];
  }

  return alerts.hits.hits.map((alert) => ({
    id: alert._id,
    index: alert._index,
    ...alert._source,
  }));
};
