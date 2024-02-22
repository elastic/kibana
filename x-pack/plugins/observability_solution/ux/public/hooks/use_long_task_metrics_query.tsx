/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEsSearch } from '@kbn/observability-shared-plugin/public';
import { useMemo } from 'react';
import { useDataView } from '../components/app/rum_dashboard/local_uifilters/use_data_view';
import { longTaskMetricsQuery } from '../services/data/long_task_metrics_query';
import { callDateMath } from '../services/data/call_date_math';
import { useLegacyUrlParams } from '../context/url_params_context/use_url_params';

export function useLongTaskMetricsQuery() {
  const {
    rangeId,
    urlParams: { start, end, searchTerm, percentile },
    uxUiFilters,
  } = useLegacyUrlParams();
  const { dataViewTitle } = useDataView();
  const { data: esQueryResponse, loading } = useEsSearch(
    {
      index: dataViewTitle,
      ...longTaskMetricsQuery(
        callDateMath(start),
        callDateMath(end),
        percentile,
        searchTerm,
        uxUiFilters
      ),
    },
    [start, end, percentile, searchTerm, uxUiFilters, rangeId, dataViewTitle],
    { name: 'UxLongTaskMetrics' }
  );

  const data = useMemo(() => {
    if (!esQueryResponse) return {};

    const pkey = Number(percentile).toFixed(1);

    const { longTaskSum, longTaskCount, longTaskMax } =
      esQueryResponse.aggregations ?? {};

    return {
      noOfLongTasks: longTaskCount?.values[pkey] ?? 0,
      sumOfLongTasks: longTaskSum?.values[pkey] ?? 0,
      longestLongTask: longTaskMax?.values[pkey] ?? 0,
    };
  }, [esQueryResponse, percentile]);

  return { data, loading };
}
