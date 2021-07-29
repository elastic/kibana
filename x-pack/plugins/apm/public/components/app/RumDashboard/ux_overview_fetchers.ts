/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FetchDataParams,
  HasDataParams,
  UxFetchDataResponse,
  UXHasDataResponse,
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
    signal: null,
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

export async function hasRumData(
  params: HasDataParams
): Promise<UXHasDataResponse> {
  return await callApmApi({
    endpoint: 'GET /api/apm/observability_overview/has_rum_data',
    signal: null,
    params: {
      query: params?.absoluteTime
        ? {
            start: new Date(params.absoluteTime.start).toISOString(),
            end: new Date(params.absoluteTime.end).toISOString(),
            uiFilters: '',
          }
        : undefined,
    },
  });
}
