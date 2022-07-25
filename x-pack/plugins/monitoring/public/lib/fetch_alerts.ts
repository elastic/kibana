/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpHandler } from '@kbn/core/public';
import { CommonAlertFilter } from '../../common/types/alerts';
import { AlertsByName } from '../alerts/types';

interface FetchAlertsParams {
  alertTypeIds?: string[];
  filters?: CommonAlertFilter[];
  timeRange: { min: number; max: number };
  clusterUuid: string;
  fetch: HttpHandler;
}

export const fetchAlerts = async ({
  alertTypeIds,
  filters,
  timeRange,
  clusterUuid,
  fetch,
}: FetchAlertsParams): Promise<AlertsByName> => {
  const url = `../api/monitoring/v1/alert/${clusterUuid}/status`;
  const response = await fetch(url, {
    method: 'POST',
    body: JSON.stringify({
      alertTypeIds,
      filters,
      timeRange,
    }),
  });
  return response as unknown as AlertsByName;
};
