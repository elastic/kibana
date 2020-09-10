/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mean } from 'lodash';
import {
  ApmFetchDataResponse,
  FetchDataParams,
} from '../../../../observability/public';
import { callApmApi } from './createCallApmApi';

export { createCallApmApi } from './createCallApmApi';

export const fetchOverviewPageData = async ({
  absoluteTime,
  relativeTime,
  bucketSize,
}: FetchDataParams): Promise<ApmFetchDataResponse> => {
  const data = await callApmApi({
    pathname: '/api/apm/observability_overview',
    params: {
      query: {
        start: new Date(absoluteTime.start).toISOString(),
        end: new Date(absoluteTime.end).toISOString(),
        bucketSize,
      },
    },
  });

  const { serviceCount, transactionCoordinates } = data;

  return {
    appLink: `/app/apm#/services?rangeFrom=${relativeTime.start}&rangeTo=${relativeTime.end}`,
    stats: {
      services: {
        type: 'number',
        value: serviceCount,
      },
      transactions: {
        type: 'number',
        value:
          mean(
            transactionCoordinates
              .map(({ y }) => y)
              .filter((y) => y && isFinite(y))
          ) || 0,
      },
    },
    series: {
      transactions: {
        coordinates: transactionCoordinates,
      },
    },
  };
};

export async function hasData() {
  return await callApmApi({
    pathname: '/api/apm/observability_overview/has_data',
  });
}
