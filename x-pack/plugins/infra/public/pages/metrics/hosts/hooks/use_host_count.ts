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

      const filters = {
        bool: {
          ...query.bool,
          filter: {
            ...query.bool.filter,
            range: {
              [dataView?.timeFieldName ?? '@timestamp']: {
                gte: dateRange.from,
                lte: dateRange.to,
                format: 'strict_date_optional_time',
              },
            },
          },
        },
      };

      return {
        request: {
          params: {
            allow_no_indices: true,
            ignore_unavailable: true,
            index: dataView?.getIndexPattern() ?? metricAlias,
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

  const {
    cancelRequest,
    isRequestRunning,
    isResponsePartial,
    latestResponseData,
    latestResponseErrors,
    loaded,
    total,
  } = useLatestPartialDataSearchResponse(requests$);

  useEffect(() => {
    fetchHostCount();
  }, [fetchHostCount]);

  return {
    cancelRequest,
    errors: latestResponseErrors,
    isRequestRunning,
    isResponsePartial,
    loaded,
    data: latestResponseData ?? null,
    total,
  };
};

export const HostCount = createContainer(useHostCount);
export const [HostCountProvider, useHostCountContext] = HostCount;

const normalizeDataSearchResponse = (response$: Observable<IKibanaSearchResponse>) =>
  response$.pipe(
    map((response) => ({
      data: decodeOrThrow(HostCountResponseRT)(response.rawResponse.aggregations),
      errors: [],
      isPartial: response.isPartial ?? false,
      isRunning: response.isRunning ?? false,
      loaded: response.loaded,
      total: response.total,
    })),
    startWith({
      data: null,
      errors: [],
      isPartial: true,
      isRunning: true,
      loaded: 0,
      total: undefined,
    }),
    catchError((error) =>
      of({
        data: null,
        errors: [error.message ?? error],
        isPartial: true,
        isRunning: false,
        loaded: 0,
        total: undefined,
      })
    )
  );

const HostCountResponseRT = rt.type({
  count: rt.type({
    value: rt.number,
  }),
});
