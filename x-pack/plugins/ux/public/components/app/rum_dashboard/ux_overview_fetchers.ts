/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESSearchResponse } from '@kbn/es-types';
import {
  DataPublicPluginStart,
  isCompleteResponse,
} from '@kbn/data-plugin/public';
import { IKibanaSearchRequest } from '@kbn/data-plugin/common';
import {
  FetchDataParams,
  HasDataParams,
  UxFetchDataResponse,
  UXHasDataResponse,
  UXMetrics,
} from '@kbn/observability-plugin/public';
import {
  coreWebVitalsQuery,
  transformCoreWebVitalsResponse,
  DEFAULT_RANKS,
} from '../../../services/data/core_web_vitals_query';
import { callApmApi } from '../../../services/rest/create_call_apm_api';
import {
  formatHasRumResult,
  hasRumDataQuery,
} from '../../../services/data/has_rum_data_query';

export { createCallApmApi } from '../../../services/rest/create_call_apm_api';

type WithDataPlugin<T> = T & { dataStartPlugin: DataPublicPluginStart };

async function getCoreWebVitalsResponse({
  absoluteTime,
  serviceName,
  dataStartPlugin,
}: WithDataPlugin<FetchDataParams>) {
  const dataViewResponse = await callApmApi(
    'GET /internal/apm/data_view/title',
    {
      signal: null,
    }
  );

  return await esQuery<ReturnType<typeof coreWebVitalsQuery>>(dataStartPlugin, {
    params: {
      index: dataViewResponse.apmDataViewTitle,
      ...coreWebVitalsQuery(absoluteTime.start, absoluteTime.end, undefined, {
        serviceName: serviceName ? [serviceName] : undefined,
      }),
    },
  });
}

const CORE_WEB_VITALS_DEFAULTS: UXMetrics = {
  coreVitalPages: 0,
  cls: 0,
  fid: 0,
  lcp: 0,
  tbt: 0,
  fcp: 0,
  lcpRanks: DEFAULT_RANKS,
  fidRanks: DEFAULT_RANKS,
  clsRanks: DEFAULT_RANKS,
};

export const fetchUxOverviewDate = async (
  params: WithDataPlugin<FetchDataParams>
): Promise<UxFetchDataResponse> => {
  const coreWebVitalsResponse = await getCoreWebVitalsResponse(params);
  return {
    coreWebVitals:
      transformCoreWebVitalsResponse(coreWebVitalsResponse) ??
      CORE_WEB_VITALS_DEFAULTS,
    appLink: `/app/ux?rangeFrom=${params.relativeTime.start}&rangeTo=${params.relativeTime.end}`,
  };
};

export async function hasRumData(
  params: WithDataPlugin<HasDataParams>
): Promise<UXHasDataResponse> {
  const dataViewResponse = await callApmApi(
    'GET /internal/apm/data_view/title',
    {
      signal: null,
    }
  );

  const esQueryResponse = await esQuery<ReturnType<typeof hasRumDataQuery>>(
    params.dataStartPlugin,
    {
      params: {
        index: dataViewResponse.apmDataViewTitle,
        ...hasRumDataQuery({
          start: params?.absoluteTime?.start,
          end: params?.absoluteTime?.end,
        }),
      },
    }
  );

  return formatHasRumResult(esQueryResponse, dataViewResponse.apmDataViewTitle);
}

async function esQuery<T>(
  dataStartPlugin: DataPublicPluginStart,
  query: IKibanaSearchRequest<T> & { params: { index?: string } }
) {
  return new Promise<ESSearchResponse<{}, T>>((resolve, reject) => {
    const search$ = dataStartPlugin.search.search(query).subscribe({
      next: (result) => {
        if (isCompleteResponse(result)) {
          resolve(result.rawResponse as any);
          search$.unsubscribe();
        }
      },
      error: (err) => {
        reject(err);
      },
    });
  });
}
