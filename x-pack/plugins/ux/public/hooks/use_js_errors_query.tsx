/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@kbn/datemath';
import { useEsSearch } from '@kbn/observability-plugin/public';
import { useMemo } from 'react';
import { useDataView } from '../components/app/rum_dashboard/local_uifilters/use_data_view';
import { jsErrorsQuery } from '../services/data/js_errors_query';
import { useLegacyUrlParams } from '../context/url_params_context/use_url_params';

function callDateMath(value: unknown): number {
  const DEFAULT_RETURN_VALUE = 0;
  if (typeof value === 'string') {
    return datemath.parse(value)?.valueOf() ?? DEFAULT_RETURN_VALUE;
  }
  return DEFAULT_RETURN_VALUE;
}

export function useJsErrorsQuery(pagination: {
  pageIndex: number;
  pageSize: number;
}) {
  const {
    rangeId,
    urlParams: { start, end, searchTerm },
    uxUiFilters,
  } = useLegacyUrlParams();
  const { dataViewTitle } = useDataView();
  const { data: esQueryResponse, loading } = useEsSearch(
    {
      index: dataViewTitle,
      ...jsErrorsQuery(
        callDateMath(start),
        callDateMath(end),
        pagination.pageSize,
        pagination.pageIndex,
        searchTerm,
        uxUiFilters
      ),
    },
    [
      start,
      end,
      searchTerm,
      uxUiFilters,
      dataViewTitle,
      pagination.pageSize,
      pagination.pageIndex,
      rangeId,
    ],
    { name: 'UxJsErrors' }
  );

  const data = useMemo(() => {
    if (!esQueryResponse) return {};

    const { totalErrorGroups, totalErrorPages, errors } =
      esQueryResponse?.aggregations ?? {};

    return {
      totalErrorPages: totalErrorPages?.value ?? 0,
      totalErrors: esQueryResponse.hits.total.value ?? 0,
      totalErrorGroups: totalErrorGroups?.value ?? 0,
      items: errors?.buckets.map(({ sample, key, impactedPages }) => {
        return {
          count: impactedPages.pageCount.value,
          errorGroupId: key,
          errorMessage: (
            sample.hits.hits[0]._source as {
              error: { exception: Array<{ message: string }> };
            }
          ).error.exception?.[0].message,
        };
      }),
    };
  }, [esQueryResponse]);

  return { data, loading };
}
