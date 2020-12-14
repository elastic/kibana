/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FetchDataParams, MetricsFetchDataResponse } from '../../observability/public';
import { OverviewRequest, OverviewResponse } from '../common/http_api/overview_api';
import { InfraClientCoreSetup } from './types';

export const createMetricsHasData = (
  getStartServices: InfraClientCoreSetup['getStartServices']
) => async () => {
  const [coreServices] = await getStartServices();
  const { http } = coreServices;
  const results = await http.get<{ hasData: boolean }>(
    '/api/metrics/source/default/metrics/hasData'
  );
  return results.hasData;
};

export const createMetricsFetchData = (
  getStartServices: InfraClientCoreSetup['getStartServices']
) => async ({ absoluteTime }: FetchDataParams): Promise<MetricsFetchDataResponse> => {
  const [coreServices] = await getStartServices();
  const { http } = coreServices;

  const { start, end } = absoluteTime;

  const overviewRequest: OverviewRequest = {
    sourceId: 'default',
    timerange: {
      from: start,
      to: end,
    },
  };

  const results = await http.post<OverviewResponse>('/api/metrics/overview', {
    body: JSON.stringify(overviewRequest),
  });
  return {
    appLink: `/app/metrics/inventory?waffleTime=(currentTime:${end},isAutoReloading:!f)`,
    stats: {
      hosts: {
        type: 'number',
        value: results.stats.hosts.value,
      },
      cpu: {
        type: 'percent',
        value: results.stats.cpu.value,
      },
      memory: {
        type: 'percent',
        value: results.stats.memory.value,
      },
    },
  };
};
