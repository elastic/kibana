/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useCallback, useContext } from 'react';
import { IIndexPattern } from 'src/plugins/data/public';
import {
  MetricsExplorerMetric,
  MetricsExplorerAggregation,
} from '../../../../../common/http_api/metrics_explorer';
import { useMetricsExplorerData } from './use_metrics_explorer_data';
import {
  MetricsExplorerOptionsContainer,
  MetricsExplorerChartOptions,
  MetricsExplorerTimeOptions,
  MetricsExplorerOptions,
} from './use_metrics_explorer_options';
import { SourceQuery } from '../../../../graphql/types';

export interface MetricExplorerViewState {
  chartOptions: MetricsExplorerChartOptions;
  currentTimerange: MetricsExplorerTimeOptions;
  options: MetricsExplorerOptions;
}

export const useMetricsExplorerState = (
  source: SourceQuery.Query['source']['configuration'],
  derivedIndexPattern: IIndexPattern,
  shouldLoadImmediately = true
) => {
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [afterKey, setAfterKey] = useState<string | null | Record<string, string | null>>(null);
  const {
    defaultViewState,
    options,
    currentTimerange,
    chartOptions,
    setChartOptions,
    setTimeRange,
    setOptions,
  } = useContext(MetricsExplorerOptionsContainer.Context);
  const { loading, error, data, loadData } = useMetricsExplorerData(
    options,
    source,
    derivedIndexPattern,
    currentTimerange,
    afterKey,
    refreshSignal,
    undefined,
    shouldLoadImmediately
  );

  const handleRefresh = useCallback(() => {
    setAfterKey(null);
    setRefreshSignal(refreshSignal + 1);
  }, [refreshSignal]);

  const handleTimeChange = useCallback(
    (start: string, end: string) => {
      setAfterKey(null);
      setTimeRange({ ...currentTimerange, from: start, to: end });
    },
    [currentTimerange, setTimeRange]
  );

  const handleGroupByChange = useCallback(
    (groupBy: string | null | string[]) => {
      setAfterKey(null);
      setOptions({
        ...options,
        groupBy: groupBy || void 0,
      });
    },
    [options, setOptions]
  );

  const handleFilterQuerySubmit = useCallback(
    (query: string) => {
      setAfterKey(null);
      setOptions({
        ...options,
        filterQuery: query,
      });
    },
    [options, setOptions]
  );

  const handleMetricsChange = useCallback(
    (metrics: MetricsExplorerMetric[]) => {
      setAfterKey(null);
      setOptions({
        ...options,
        metrics,
      });
    },
    [options, setOptions]
  );

  const handleAggregationChange = useCallback(
    (aggregation: MetricsExplorerAggregation) => {
      setAfterKey(null);
      const metrics =
        aggregation === 'count'
          ? [{ aggregation }]
          : options.metrics
              .filter((metric) => metric.aggregation !== 'count')
              .map((metric) => ({
                ...metric,
                aggregation,
              }));
      setOptions({ ...options, aggregation, metrics });
    },
    [options, setOptions]
  );

  const onViewStateChange = useCallback(
    (vs: MetricExplorerViewState) => {
      if (vs.chartOptions) {
        setChartOptions(vs.chartOptions);
      }
      if (vs.currentTimerange) {
        setTimeRange(vs.currentTimerange);
      }
      if (vs.options) {
        setOptions(vs.options);
      }
    },
    [setChartOptions, setOptions, setTimeRange]
  );

  return {
    loading,
    error,
    data,
    currentTimerange,
    options,
    chartOptions,
    setChartOptions,
    handleAggregationChange,
    handleMetricsChange,
    handleFilterQuerySubmit,
    handleGroupByChange,
    handleTimeChange,
    handleRefresh,
    handleLoadMore: setAfterKey,
    defaultViewState,
    onViewStateChange,
    loadData,
    refreshSignal,
    afterKey,
  };
};
