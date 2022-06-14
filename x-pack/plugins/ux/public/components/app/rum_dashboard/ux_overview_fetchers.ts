/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESSearchResponse } from '@kbn/core/types/elasticsearch';
import {
  DataPublicPluginStart,
  isCompleteResponse,
} from '@kbn/data-plugin/public';
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

export { createCallApmApi } from '../../../services/rest/create_call_apm_api';

type FetchUxOverviewDateParams = FetchDataParams & {
  dataStartPlugin: DataPublicPluginStart;
};

async function getCoreWebVitalsResponse({
  absoluteTime,
  serviceName,
  dataStartPlugin,
}: FetchUxOverviewDateParams) {
  const dataView = await callApmApi('GET /internal/apm/data_view/dynamic', {
    signal: null,
  });
  return new Promise<
    ESSearchResponse<{}, ReturnType<typeof coreWebVitalsQuery>>
  >((resolve) => {
    const search$ = dataStartPlugin.search
      .search(
        {
          params: {
            index: dataView.dynamicDataView?.title,
            ...coreWebVitalsQuery(
              absoluteTime.start,
              absoluteTime.end,
              undefined,
              {
                serviceName: serviceName ? [serviceName] : undefined,
              }
            ),
          },
        },
        {}
      )
      .subscribe({
        next: (result) => {
          if (isCompleteResponse(result)) {
            resolve(result.rawResponse as any);
            search$.unsubscribe();
          }
        },
      });
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
  params: FetchUxOverviewDateParams
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
  params: HasDataParams
): Promise<UXHasDataResponse> {
  return await callApmApi('GET /api/apm/observability_overview/has_rum_data', {
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
