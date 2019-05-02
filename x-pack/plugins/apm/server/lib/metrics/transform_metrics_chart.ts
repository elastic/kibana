/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { AggregationSearchResponse } from 'elasticsearch';
import { ChartBase, Chart, MetricsAggs, MetricsKeys } from './query_types';

export function transformDataToChart<T extends MetricsKeys>(
  result: AggregationSearchResponse<void, MetricsAggs<T>>,
  chartBase: ChartBase<T>
) {
  const { aggregations, hits } = result;
  const { timeseriesData } = aggregations;
  const seriesTitleMap = chartBase.series;

  const chart: Chart<T> = {
    ...chartBase,
    totalHits: hits.total,
    series: Object.keys(chartBase.series).map(series => ({
      title: seriesTitleMap[series],
      key: series,
      overallValue: aggregations[series].value,
      data: timeseriesData.buckets.map(bucket => ({
        x: bucket.key,
        y: bucket[series].value
      }))
    }))
  };

  return chart;
}
