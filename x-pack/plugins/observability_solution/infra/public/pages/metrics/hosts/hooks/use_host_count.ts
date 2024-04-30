/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { ES_SEARCH_STRATEGY, IKibanaSearchResponse } from '@kbn/data-plugin/common';
import { useCallback, useEffect, useMemo } from 'react';
import { catchError, map, Observable, of, startWith, tap } from 'rxjs';
import createContainer from 'constate';
import type { QueryDslQueryContainer, SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type { ITelemetryClient } from '../../../../services/telemetry';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import { decodeOrThrow } from '../../../../../common/runtime_types';
import { useDataSearch, useLatestPartialDataSearchResponse } from '../../../../utils/data_search';
import { useMetricsDataViewContext } from './use_metrics_data_view';
import { useUnifiedSearchContext } from './use_unified_search';

export const useHostCount = () => {
  const { dataView, metricAlias } = useMetricsDataViewContext();
  const {
    services: { telemetry },
  } = useKibanaContextForPlugin();
  const { buildQuery, searchCriteria } = useUnifiedSearchContext();

  const { search: fetchHostCount, requests$ } = useDataSearch({
    getRequest: useCallback(() => {
      const query = buildQuery();

      const filters: QueryDslQueryContainer = {
        bool: {
          ...query.bool,
          filter: [
            ...query.bool.filter,
            {
              exists: {
                field: 'host.name',
              },
            },
            {
              range: {
                [dataView?.timeFieldName ?? '@timestamp']: {
                  gte: searchCriteria.dateRange.from,
                  lte: searchCriteria.dateRange.to,
                },
              },
            },
          ],
        },
      };

      return {
        request: {
          params: {
            allow_no_indices: true,
            ignore_unavailable: true,
            index: metricAlias,
            size: 0,
            track_total_hits: false,
            body: {
              query: filters,
              aggs: {
                count: {
                  cardinality: {
                    field: 'host.name',
                  },
                },
              },
            },
          },
        },
        options: { strategy: ES_SEARCH_STRATEGY },
      };
    }, [
      buildQuery,
      dataView?.timeFieldName,
      metricAlias,
      searchCriteria.dateRange.from,
      searchCriteria.dateRange.to,
    ]),
    parseResponses: useMemo(
      () =>
        normalizeDataSearchResponse({
          telemetry,
          telemetryData: {
            withQuery: !!searchCriteria.query.query,
            withFilters:
              searchCriteria.filters.length > 0 || searchCriteria.panelFilters.length > 0,
          },
        }),
      [
        searchCriteria.filters.length,
        searchCriteria.panelFilters.length,
        searchCriteria.query.query,
        telemetry,
      ]
    ),
  });

  const { isRequestRunning, isResponsePartial, latestResponseData, latestResponseErrors } =
    useLatestPartialDataSearchResponse(requests$);

  useEffect(() => {
    fetchHostCount();
  }, [fetchHostCount]);

  return {
    errors: latestResponseErrors,
    isRequestRunning,
    isResponsePartial,
    data: latestResponseData ?? null,
  };
};

export const HostCount = createContainer(useHostCount);
export const [HostCountProvider, useHostCountContext] = HostCount;

const INITIAL_STATE = {
  data: null,
  errors: [],
  isPartial: true,
  isRunning: true,
  loaded: 0,
  total: undefined,
};

const normalizeDataSearchResponse =
  ({
    telemetry,
    telemetryData,
  }: {
    telemetry: ITelemetryClient;
    telemetryData: { withQuery: boolean; withFilters: boolean };
  }) =>
  (response$: Observable<IKibanaSearchResponse<SearchResponse<Record<string, unknown>>>>) => {
    return response$.pipe(
      map((response) => ({
        data: decodeOrThrow(HostCountResponseRT)(response.rawResponse.aggregations),
        errors: [],
        isPartial: response.isPartial ?? false,
        isRunning: response.isRunning ?? false,
        loaded: response.loaded,
        total: response.total,
      })),
      tap(({ data }) => {
        telemetry.reportHostsViewTotalHostCountRetrieved({
          total: data.count.value,
          with_query: telemetryData.withQuery,
          with_filters: telemetryData.withFilters,
        });
      }),
      startWith(INITIAL_STATE),
      catchError((error) =>
        of({
          ...INITIAL_STATE,
          errors: [error.message ?? error],
          isRunning: false,
        })
      )
    );
  };

const HostCountResponseRT = rt.type({
  count: rt.type({
    value: rt.number,
  }),
});
