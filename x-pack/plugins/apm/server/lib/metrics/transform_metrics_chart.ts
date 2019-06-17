/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import theme from '@elastic/eui/dist/eui_theme_light.json';
import { AggregationSearchResponse, AggregatedValue } from 'elasticsearch';
import { ChartBase } from './types';

const colors = [
  theme.euiColorVis0,
  theme.euiColorVis1,
  theme.euiColorVis2,
  theme.euiColorVis3,
  theme.euiColorVis4,
  theme.euiColorVis5,
  theme.euiColorVis6
];

export type GenericMetricsChart = ReturnType<
  typeof transformDataToMetricsChart
>;

interface AggregatedParams {
  body: {
    aggs: {
      timeseriesData: {
        date_histogram: any;
        aggs: {
          min?: any;
          max?: any;
          sum?: any;
          avg?: any;
        };
      };
    } & {
      [key: string]: {
        min?: any;
        max?: any;
        sum?: any;
        avg?: any;
      };
    };
  };
}

export function transformDataToMetricsChart<Params extends AggregatedParams>(
  result: AggregationSearchResponse<unknown, Params>,
  chartBase: ChartBase
) {
  const { aggregations, hits } = result;
  const { timeseriesData } = aggregations;

  return {
    title: chartBase.title,
    key: chartBase.key,
    yUnit: chartBase.yUnit,
    totalHits: hits.total,
    series: Object.keys(chartBase.series).map((seriesKey, i) => {
      const agg = aggregations[seriesKey];

      return {
        title: chartBase.series[seriesKey].title,
        key: seriesKey,
        type: chartBase.type,
        color: chartBase.series[seriesKey].color || colors[i],
        overallValue: agg.value,
        data: timeseriesData.buckets.map(bucket => {
          const { value } = bucket[seriesKey] as AggregatedValue;
          const y = value === null || isNaN(value) ? null : value;
          return {
            x: bucket.key,
            y
          };
        })
      };
    })
  };
}
