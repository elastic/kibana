/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { ES_SEARCH_STRATEGY, IKibanaSearchResponse } from '@kbn/data-plugin/common';
import { useCallback, useEffect } from 'react';
import { catchError, map, Observable, of, startWith } from 'rxjs';
import createContainer from 'constate';
import type { QueryDslQueryContainer, SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { decodeOrThrow } from '../../../../../common/runtime_types';
import { useDataSearch, useLatestPartialDataSearchResponse } from '../../../../utils/data_search';
import { useMetricsDataViewContext } from './use_data_view';
import { useUnifiedSearchContext } from './use_unified_search';

export const useHostCount = () => {
  const { dataView, metricAlias } = useMetricsDataViewContext();
  const { buildQuery, getParsedDateRange } = useUnifiedSearchContext();

  const { search: fetchHostCount, requests$ } = useDataSearch({
    getRequest: useCallback(() => {
      const query = buildQuery();
      const dateRange = getParsedDateRange();

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
                  gte: dateRange.from,
                  lte: dateRange.to,
                  format: 'strict_date_optional_time',
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
    }, [buildQuery, dataView, getParsedDateRange, metricAlias]),
    parseResponses: normalizeDataSearchResponse,
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
const normalizeDataSearchResponse = (
  response$: Observable<IKibanaSearchResponse<SearchResponse<Record<string, unknown>>>>
) =>
  response$.pipe(
    map((response) => ({
      data: decodeOrThrow(HostCountResponseRT)(response.rawResponse.aggregations),
      errors: [],
      isPartial: response.isPartial ?? false,
      isRunning: response.isRunning ?? false,
      loaded: response.loaded,
      total: response.total,
    })),
    startWith(INITIAL_STATE),
    catchError((error) =>
      of({
        ...INITIAL_STATE,
        errors: [error.message ?? error],
        isRunning: false,
      })
    )
  );

const HostCountResponseRT = rt.type({
  count: rt.type({
    value: rt.number,
  }),
});
