/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Coordinate } from '../../../../../typings/timeseries';
import { ESResponse } from './fetcher';
import { charts, seriesTitleMap, Chart, JavaMetricName } from './chartConfig';

interface LoadedChart {
  title: Chart['title'];
  key: Chart['key'];
  type: Chart['type'];
  series: ChartSeries[];
}

interface ChartSeries {
  title: string;
  key: JavaMetricName;
  overallValue: number | null;
  data: Coordinate[];
}

export function transform(result: ESResponse) {
  const { aggregations, hits } = result;
  const { timeseriesData } = aggregations;

  const loadedCharts: LoadedChart[] = charts.map(chart => ({
    ...chart,
    series: chart.series.map(series => ({
      title: seriesTitleMap[series],
      key: series,
      overallValue: aggregations[series].value,
      data: timeseriesData.buckets.map(({ key, ...bucket }) => ({
        x: key,
        y: bucket[series].value
      }))
    }))
  }));

  return {
    charts: loadedCharts,
    totalHits: hits.total
  };
}
