/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import theme from '@elastic/eui/dist/eui_theme_light.json';
import { ESSearchResponse } from '../../../../../../src/core/types/elasticsearch';
import { getVizColorForIndex } from '../../../common/viz_colors';
import { GenericMetricsRequest } from './fetch_and_transform_metrics';
import { ChartBase } from './types';

export type GenericMetricsChart = ReturnType<
  typeof transformDataToMetricsChart
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
      const overallValue = aggregations?.[seriesKey]?.value;

      return {
        title: chartBase.series[seriesKey].title,
        key: seriesKey,
        type: chartBase.type,
        color:
          chartBase.series[seriesKey].color || getVizColorForIndex(i, theme),
        overallValue,
        data:
          timeseriesData?.buckets.map((bucket) => {
            const { value } = bucket[seriesKey];
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
