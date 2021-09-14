/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FetchDataParams, MetricsFetchDataResponse } from '../../observability/public';
import { TopNodesRequest, TopNodesResponse } from '../common/http_api/overview_api';
import { InfraClientCoreSetup } from './types';

export const createMetricsHasData = (
  getStartServices: InfraClientCoreSetup['getStartServices']
) => async () => {
  const [coreServices] = await getStartServices();
  const { http } = coreServices;
  const results = await http.get<{ hasData: boolean }>('/api/metrics/source/default/hasData');
  return results.hasData;
};

export const createMetricsFetchData = (
  getStartServices: InfraClientCoreSetup['getStartServices']
) => async ({ absoluteTime, bucketSize }: FetchDataParams): Promise<MetricsFetchDataResponse> => {
  const [coreServices] = await getStartServices();
  const { http } = coreServices;

  const makeRequest = async (overrides: Partial<TopNodesRequest> = {}) => {
    const { start, end } = absoluteTime;

    const overviewRequest: TopNodesRequest = {
      sourceId: 'default',
      bucketSize,
      size: 5,
      timerange: {
        from: start,
        to: end,
      },
      ...overrides,
    };
    const results = await http.post<TopNodesResponse>('/api/metrics/overview/top', {
      body: JSON.stringify(overviewRequest),
    });
    return {
      appLink: `/app/metrics/inventory?waffleTime=(currentTime:${end},isAutoReloading:!f)`,
      series: results.series,
      sort: async (by: string, direction: string) =>
        makeRequest({ sort: by, sortDirection: direction }),
    };
  };

  return await makeRequest();
};
