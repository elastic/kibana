/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiLightVars as theme } from '@kbn/ui-shared-deps-src/theme';
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
  const { aggregations } = result;
  const timeseriesData = aggregations?.timeseriesData;

  return {
    title: chartBase.title,
    key: chartBase.key,
    yUnit: chartBase.yUnit,
    series:
      result.hits.total.value > 0
        ? Object.keys(chartBase.series).map((seriesKey, i) => {
            const overallValue = aggregations?.[seriesKey]?.value;

            return {
              title: chartBase.series[seriesKey].title,
              key: seriesKey,
              type: chartBase.type,
              color:
                chartBase.series[seriesKey].color ||
                getVizColorForIndex(i, theme),
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
          })
        : [],
  };
}
