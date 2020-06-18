/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import theme from '@elastic/eui/dist/eui_theme_light.json';
import { Unionize, Overwrite } from 'utility-types';
import { ChartBase } from './types';
import {
  ESSearchResponse,
  ESSearchRequest,
} from '../../../typings/elasticsearch';
import { AggregationOptionsByType } from '../../../typings/elasticsearch/aggregations';
import { getVizColorForIndex } from '../../../common/viz_colors';

export type GenericMetricsChart = ReturnType<
  typeof transformDataToMetricsChart
>;

interface MetricsAggregationMap {
  min: AggregationOptionsByType['min'];
  max: AggregationOptionsByType['max'];
  sum: AggregationOptionsByType['sum'];
  avg: AggregationOptionsByType['avg'];
}

type GenericMetricsRequest = Overwrite<
  ESSearchRequest,
  {
    body: {
      aggs: {
        timeseriesData: {
          date_histogram: AggregationOptionsByType['date_histogram'];
          aggs: Record<string, Unionize<MetricsAggregationMap>>;
        };
      } & Record<string, Unionize<MetricsAggregationMap>>;
    };
  }
>;

export function transformDataToMetricsChart(
  result: ESSearchResponse<unknown, GenericMetricsRequest>,
  chartBase: ChartBase
) {
  const { aggregations, hits } = result;
  const timeseriesData = aggregations?.timeseriesData;

  return {
    title: chartBase.title,
    key: chartBase.key,
    yUnit: chartBase.yUnit,
    noHits: hits.total.value === 0,
    series: Object.keys(chartBase.series).map((seriesKey, i) => {
      const overallValue = (aggregations?.[seriesKey] as
        | {
            value: number | null;
          }
        | undefined)?.value;

      return {
        title: chartBase.series[seriesKey].title,
        key: seriesKey,
        type: chartBase.type,
        color:
          chartBase.series[seriesKey].color || getVizColorForIndex(i, theme),
        overallValue,
        data:
          timeseriesData?.buckets.map((bucket) => {
            const { value } = bucket[seriesKey] as { value: number | null };
            const y = value === null || isNaN(value) ? null : value;
            return {
              x: bucket.key,
              y,
            };
          }) || [],
      };
    }),
  };
}
