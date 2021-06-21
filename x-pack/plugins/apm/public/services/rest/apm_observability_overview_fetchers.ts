/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ApmFetchDataResponse,
  FetchDataParams,
} from '../../../../observability/public';
import { callApmApi } from './createCallApmApi';

export { createCallApmApi } from './createCallApmApi';

export const fetchObservabilityOverviewPageData = async ({
  absoluteTime,
  relativeTime,
  bucketSize,
}: FetchDataParams): Promise<ApmFetchDataResponse> => {
  const data = await callApmApi({
    endpoint: 'GET /api/apm/observability_overview',
    signal: null,
    params: {
      query: {
        start: new Date(absoluteTime.start).toISOString(),
        end: new Date(absoluteTime.end).toISOString(),
        bucketSize,
      },
    },
  });

  const { serviceCount, transactionPerMinute } = data;

  return {
    appLink: `/app/apm/services?rangeFrom=${relativeTime.start}&rangeTo=${relativeTime.end}`,
    stats: {
      services: {
        type: 'number',
        value: serviceCount,
      },
      transactions: {
        type: 'number',
        value: transactionPerMinute.value || 0,
      },
    },
    series: {
      transactions: {
        coordinates: transactionPerMinute.timeseries,
      },
    },
  };
};

export async function getHasData() {
  return await callApmApi({
    endpoint: 'GET /api/apm/observability_overview/has_data',
    signal: null,
  });
}
