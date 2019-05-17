/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useCallback, useContext } from 'react';
import { StaticIndexPattern } from 'ui/index_patterns';
import {
  MetricsExplorerMetric,
  MetricsExplorerAggregation,
} from '../../../../server/routes/metrics_explorer/types';
import { useMetricsExplorerData } from '../../../containers/metrics_explorer/use_metrics_explorer_data';
import { MetricsExplorerOptionsContainer } from '../../../containers/metrics_explorer/use_metrics_explorer_options';
import { SourceQuery } from '../../../graphql/types';

export const useMetricsExplorerState = (
  source: SourceQuery.Query['source']['configuration'],
  derivedIndexPattern: StaticIndexPattern
) => {
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [afterKey, setAfterKey] = useState<string | null>(null);
  const { options, currentTimerange, setTimeRange, setOptions } = useContext(
    MetricsExplorerOptionsContainer.Context
  );
  const { loading, error, data } = useMetricsExplorerData(
    options,
    source,
    derivedIndexPattern,
    currentTimerange,
    afterKey,
    refreshSignal
  );

  const handleRefresh = useCallback(
    () => {
      setAfterKey(null);
      setRefreshSignal(refreshSignal + 1);
    },
    [refreshSignal]
  );

  const handleTimeChange = useCallback(
    (start: string, end: string) => {
      setOptions({ ...options });
      setAfterKey(null);
      setTimeRange({ ...currentTimerange, from: start, to: end });
    },
    [options, currentTimerange]
  );

  const handleGroupByChange = useCallback(
    (groupBy: string | null) => {
      setAfterKey(null);
      setOptions({
        ...options,
        groupBy: groupBy || void 0,
      });
    },
    [options]
  );

  const handleFilterQuerySubmit = useCallback(
    (query: string) => {
      setAfterKey(null);
      setOptions({
        ...options,
        filterQuery: query,
      });
    },
    [options]
  );

  const handleMetricsChange = useCallback(
    (metrics: MetricsExplorerMetric[]) => {
      setAfterKey(null);
      setOptions({
        ...options,
        metrics,
      });
    },
    [options]
  );

  const handleAggregationChange = useCallback(
    (aggregation: MetricsExplorerAggregation) => {
      setAfterKey(null);
      const metrics =
        aggregation === MetricsExplorerAggregation.count
          ? [{ aggregation }]
          : options.metrics
              .filter(metric => metric.aggregation !== MetricsExplorerAggregation.count)
              .map(metric => ({
                ...metric,
                aggregation,
              }));
      setOptions({ ...options, aggregation, metrics });
    },
    [options]
  );

  return {
    loading,
    error,
    data,
    currentTimerange,
    options,
    handleAggregationChange,
    handleMetricsChange,
    handleFilterQuerySubmit,
    handleGroupByChange,
    handleTimeChange,
    handleRefresh,
    handleLoadMore: setAfterKey,
  };
};
