/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { AggregationSearchResponse } from 'elasticsearch';
import theme from '@elastic/eui/dist/eui_theme_light.json';
import {
  ChartBase,
  MetricsAggs,
  MetricSeriesKeys,
  JavaGcMetricsAggs
} from './types';

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
export function transformDataToMetricsChart<T extends MetricSeriesKeys>(
  result: AggregationSearchResponse<void, MetricsAggs<T>>,
  chartBase: ChartBase<T>
) {
  const { aggregations, hits } = result;
  const { timeseriesData } = aggregations;

  return {
    title: chartBase.title,
    key: chartBase.key,
    yUnit: chartBase.yUnit,
    totalHits: hits.total,
    series: Object.keys(chartBase.series).map((seriesKey, i) => ({
      title: chartBase.series[seriesKey].title,
      key: seriesKey,
      type: chartBase.type,
      color: chartBase.series[seriesKey].color || colors[i],
      overallValue: aggregations[seriesKey].value,
      data: timeseriesData.buckets.map(bucket => {
        const { value } = bucket[seriesKey];
        const y = value === null || isNaN(value) ? null : value;
        return {
          x: bucket.key,
          y
        };
      })
    }))
  };
}

function mergeTimeseriesDataBuckets(
  buckets: JavaGcMetricsAggs<MetricSeriesKeys>['perAgent']['buckets'],
  chartBase: ChartBase<MetricSeriesKeys>
) {
  if (buckets.length === 1) {
    return buckets[0].timeseriesData;
  }
  const seriesKeys = Object.keys(chartBase.series);
  const timeseriesBucketMap = new Map<
    number,
    typeof buckets[0]['timeseriesData']['buckets'][0]
  >();
  const timeseriesDataBucketMap = buckets.reduce(
    (tsDataBucketMap, perAgentBucket) => {
      return perAgentBucket.timeseriesData.buckets.reduce(
        (map, timeseriesBucket) => {
          const bucketData = map.get(timeseriesBucket.key) || {};
          timeseriesBucketMap.set(timeseriesBucket.key, timeseriesBucket);
          map.set(timeseriesBucket.key, bucketData);
          seriesKeys.forEach(seriesKey => {
            bucketData[seriesKey] =
              (bucketData[seriesKey] || 0) +
              (timeseriesBucket[seriesKey].value || 0);
          });
          return map;
        },
        tsDataBucketMap
      );
    },
    new Map<number, { [seriesKey: string]: number }>()
  );
  return {
    buckets: Array.from(timeseriesDataBucketMap.entries())
      .map(([timeseriesDataKey, timeseriesDataObject]) => {
        return {
          ...timeseriesBucketMap.get(timeseriesDataKey),
          ...timeseriesDataObject
        } as typeof buckets[0]['timeseriesData']['buckets'][0];
      })
      .sort(({ key: key0 }, { key: key1 }) => key0 - key1)
  };
}

export function transformJavaGcDataToMetricsChart<T extends MetricSeriesKeys>(
  result: AggregationSearchResponse<void, JavaGcMetricsAggs<T>>,
  chartBase: ChartBase<T>
) {
  const { aggregations, hits } = result;
  const { perAgent } = aggregations;
  const timeseriesData = mergeTimeseriesDataBuckets(
    perAgent.buckets,
    chartBase
  );
  return {
    title: chartBase.title,
    key: chartBase.key,
    yUnit: chartBase.yUnit,
    totalHits: hits.total,
    series: Object.keys(chartBase.series).map((seriesKey, i) => ({
      title: chartBase.series[seriesKey].title,
      key: seriesKey,
      type: chartBase.type,
      color: chartBase.series[seriesKey].color || colors[i],
      overallValue: perAgent.buckets[0][seriesKey].value,
      data: timeseriesData.buckets.map(bucket => {
        let y = null;
        if (bucket[seriesKey]) {
          const { value } = bucket[seriesKey];
          if (value !== null && !isNaN(value)) {
            y = value;
          }
        }
        return {
          x: bucket.key,
          y
        };
      })
    }))
  };
}
