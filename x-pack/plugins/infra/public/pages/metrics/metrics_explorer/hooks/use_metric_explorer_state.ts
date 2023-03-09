/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import DateMath from '@kbn/datemath';
import { useCallback, useEffect } from 'react';
import { DataViewBase } from '@kbn/es-query';
import { MetricsSourceConfigurationProperties } from '../../../../../common/metrics_sources';
import {
  MetricsExplorerMetric,
  MetricsExplorerAggregation,
} from '../../../../../common/http_api/metrics_explorer';
import { useMetricsExplorerData } from './use_metrics_explorer_data';
import {
  useMetricsExplorerOptionsContainerContext,
  MetricsExplorerChartOptions,
  MetricsExplorerTimeOptions,
  MetricsExplorerOptions,
} from './use_metrics_explorer_options';

export interface MetricExplorerViewState {
  chartOptions: MetricsExplorerChartOptions;
  currentTimerange: MetricsExplorerTimeOptions;
  options: MetricsExplorerOptions;
  id?: string;
}

const getTimestamps = (from: string, to: string) => {
  const fromTimestamp = DateMath.parse(from)!.valueOf();
  const toTimestamp = DateMath.parse(to, { roundUp: true })!.valueOf();

  return {
    fromTimestamp,
    toTimestamp,
  };
};

export const useMetricsExplorerState = (
  source: MetricsSourceConfigurationProperties,
  derivedIndexPattern: DataViewBase,
  enabled = true
) => {
  const {
    defaultViewState,
    options,
    timeRange,
    chartOptions,
    setChartOptions,
    setTimeRange,
    setOptions,
    timestamps,
    setTimestamps,
  } = useMetricsExplorerOptionsContainerContext();

  const { data, error, fetchNextPage, isLoading } = useMetricsExplorerData(
    options,
    source,
    derivedIndexPattern,
    timestamps,
    enabled
  );

  useEffect(() => {
    setTimestamps({
      interval: timeRange.interval,
      ...getTimestamps(timeRange.from, timeRange.to),
    });
  }, [timeRange, setTimestamps, options, setOptions]);

  const handleTimeChange = useCallback(
    (start: string, end: string) => {
      setTimeRange({ interval: timeRange.interval, from: start, to: end });
    },
    [setTimeRange, timeRange.interval]
  );

  const refetch = useCallback(() => {
    setTimestamps({
      interval: timeRange.interval,
      ...getTimestamps(timeRange.from, timeRange.to),
    });
  }, [setTimestamps, timeRange]);

  const handleGroupByChange = useCallback(
    (groupBy: string | null | string[]) => {
      setOptions({
        ...options,
        groupBy: groupBy || void 0,
      });
    },
    [options, setOptions]
  );

  const handleFilterQuerySubmit = useCallback(
    (query: string) => {
      setOptions({
        ...options,
        filterQuery: query,
      });
    },
    [options, setOptions]
  );

  const handleMetricsChange = useCallback(
    (metrics: MetricsExplorerMetric[]) => {
      setOptions({
        ...options,
        metrics,
      });
    },
    [options, setOptions]
  );

  const handleAggregationChange = useCallback(
    (aggregation: MetricsExplorerAggregation) => {
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
        // if this is the "Default View" view, don't update the time range to the view's time range,
        // this way it will use the global Kibana time or the default time already set
        if (vs.id !== '0') {
          setTimeRange(vs.currentTimerange);
        }
      }
      if (vs.options) {
        setOptions(vs.options);
      }
    },
    [setChartOptions, setOptions, setTimeRange]
  );

  return {
    chartOptions,
    timeRange,
    data,
    defaultViewState,
    error,
    isLoading,
    handleAggregationChange,
    handleMetricsChange,
    handleFilterQuerySubmit,
    handleGroupByChange,
    handleTimeChange,
    handleLoadMore: fetchNextPage,
    onViewStateChange,
    options,
    setChartOptions,
    refetch,
  };
};
