/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  FetchDataParams,
  HasDataParams,
  UxFetchDataResponse,
} from '../../../../../observability/public/';
import { callApmApi } from '../../../services/rest/createCallApmApi';

export { createCallApmApi } from '../../../services/rest/createCallApmApi';

export const fetchUxOverviewDate = async ({
  absoluteTime,
  relativeTime,
  serviceName,
}: FetchDataParams): Promise<UxFetchDataResponse> => {
  const data = await callApmApi({
    endpoint: 'GET /api/apm/rum-client/web-core-vitals',
    params: {
      query: {
        start: new Date(absoluteTime.start).toISOString(),
        end: new Date(absoluteTime.end).toISOString(),
        uiFilters: `{"serviceName":["${serviceName}"]}`,
      },
    },
  });

  return {
    coreWebVitals: data,
    appLink: `/app/ux?rangeFrom=${relativeTime.start}&rangeTo=${relativeTime.end}`,
  };
};

export async function hasRumData({ absoluteTime }: HasDataParams) {
  return await callApmApi({
    endpoint: 'GET /api/apm/observability_overview/has_rum_data',
    params: {
      query: {
        start: new Date(absoluteTime.start).toISOString(),
        end: new Date(absoluteTime.end).toISOString(),
        uiFilters: '',
      },
    },
  });
}
