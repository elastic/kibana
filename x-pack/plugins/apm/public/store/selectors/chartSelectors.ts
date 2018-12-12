/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import d3 from 'd3';
import { difference, memoize, zipObject } from 'lodash';
import mean from 'lodash.mean';
import { rgba } from 'polished';
import { MetricsChartAPIResponse } from 'x-pack/plugins/apm/server/lib/metrics/get_all_metrics_chart_data';
import { TimeSeriesAPIResponse } from 'x-pack/plugins/apm/server/lib/transactions/charts';
import { AnomalyTimeSeriesResponse } from 'x-pack/plugins/apm/server/lib/transactions/charts/get_anomaly_data/transform';
import { ApmTimeSeriesResponse } from 'x-pack/plugins/apm/server/lib/transactions/charts/get_timeseries_data/transform';
import { StringMap } from 'x-pack/plugins/apm/typings/common';
import {
  Coordinate,
  RectCoordinate
} from 'x-pack/plugins/apm/typings/timeseries';
import { colors } from '../../style/variables';
import { asDecimal, asGB, asMillis, tpmUnit } from '../../utils/formatters';
import { IUrlParams } from '../urlParams';

export const getEmptySerie = memoize(
  (start = Date.now() - 3600000, end = Date.now()) => {
    const dates = d3.time
      .scale()
      .domain([new Date(start), new Date(end)])
      .ticks();

    return [
      {
        data: dates.map(x => ({
          x: x.getTime(),
          y: 1
        }))
      }
    ];
  },
  (start: number, end: number) => [start, end].join('_')
);

export interface IEmptySeries {
  data: Array<{
    x: number;
    y: number;
  }>;
}

export interface ITpmBucket {
  title: string;
  data: any;
  legendValue: string;
  type: string;
  color: string;
}

export interface ITransactionChartData {
  noHits: boolean;
  tpmSeries: ITpmBucket[] | IEmptySeries[];
  responseTimeSeries: TimeSerie[] | IEmptySeries[];
}

export function getTransactionCharts(
  urlParams: IUrlParams,
  timeseriesResponse: TimeSeriesAPIResponse
) {
  const { start, end, transactionType } = urlParams;
  const { apmTimeseries, anomalyTimeseries } = timeseriesResponse;
  const noHits = apmTimeseries.totalHits === 0;
  const tpmSeries = noHits
    ? getEmptySerie(start, end)
    : getTpmSeries(apmTimeseries, transactionType);

  const responseTimeSeries = noHits
    ? getEmptySerie(start, end)
    : getResponseTimeSeries(apmTimeseries, anomalyTimeseries);

  const chartsResult: ITransactionChartData = {
    noHits,
    tpmSeries,
    responseTimeSeries
  };

  return chartsResult;
}

export interface IMemoryChartData extends MetricsChartAPIResponse {
  series: TimeSerie[];
}

export function getMemorySeries(
  memoryChartResponse: MetricsChartAPIResponse['memory']
) {
  const { series, overallValues } = memoryChartResponse;
  const seriesList: IMemoryChartData['series'] = [
    {
      title: 'System total mem.',
      data: series.totalMemory,
      type: 'area',
      color: colors.apmPink,
      legendValue: asGB(overallValues.totalMemory)
    },
    {
      title: 'System avail. mem.',
      data: series.freeMemory,
      type: 'area',
      color: colors.apmPurple,
      legendValue: asGB(overallValues.freeMemory)
    },
    {
      title: 'Process RSS',
      data: series.processMemoryRss,
      type: 'area',
      color: colors.apmGreen,
      legendValue: asGB(overallValues.processMemoryRss)
    },
    {
      title: 'Process mem. size',
      data: series.processMemorySize,
      type: 'area',
      color: colors.apmBlue,
      legendValue: asGB(overallValues.freeMemory)
    }
  ];

  return {
    ...memoryChartResponse,
    series: seriesList
  };
}

export interface ICPUChartData extends MetricsChartAPIResponse {
  series: TimeSerie[];
}

export function getCPUSeries(CPUChartResponse: MetricsChartAPIResponse['cpu']) {
  const { series, overallValues } = CPUChartResponse;

  const seriesList: TimeSerie[] = [
    {
      title: 'Process average',
      data: series.processCPUAverage,
      type: 'line',
      color: colors.apmPink,
      legendValue: (overallValues.processCPUAverage || 0).toFixed(2) + '%'
    },
    {
      title: 'Process max',
      data: series.processCPUMax,
      type: 'line',
      color: colors.apmPurple,
      legendValue: (overallValues.processCPUMax || 0).toFixed(2) + '%'
    },
    {
      title: 'System average',
      data: series.systemCPUAverage,
      type: 'line',
      color: colors.apmGreen,
      legendValue: (overallValues.systemCPUAverage || 0).toFixed(2) + '%'
    },
    {
      title: 'System max',
      data: series.systemCPUMax,
      type: 'line',
      color: colors.apmBlue,
      legendValue: (overallValues.systemCPUMax || 0).toFixed(2) + '%'
    }
  ];

  return { ...CPUChartResponse, series: seriesList };
}

interface TimeSerie {
  title: string;
  titleShort?: string;
  hideLegend?: boolean;
  hideTooltipValue?: boolean;
  data: Array<Coordinate | RectCoordinate>;
  legendValue?: string;
  type: string;
  color: string;
  areaColor?: string;
}

export function getResponseTimeSeries(
  apmTimeseries: ApmTimeSeriesResponse,
  anomalyTimeseries?: AnomalyTimeSeriesResponse
) {
  const { overallAvgDuration } = apmTimeseries;
  const { avg, p95, p99 } = apmTimeseries.responseTimes;

  const series: TimeSerie[] = [
    {
      title: 'Avg.',
      data: avg,
      legendValue: asMillis(overallAvgDuration),
      type: 'line',
      color: colors.apmBlue
    },
    {
      title: '95th percentile',
      titleShort: '95th',
      data: p95,
      type: 'line',
      color: colors.apmYellow
    },
    {
      title: '99th percentile',
      titleShort: '99th',
      data: p99,
      type: 'line',
      color: colors.apmOrange
    }
  ];

  if (anomalyTimeseries) {
    // insert after Avg. series
    series.splice(
      1,
      0,
      getAnomalyBoundariesSeries(anomalyTimeseries.anomalyBoundaries),
      getAnomalyScoreSeries(anomalyTimeseries.anomalyScore)
    );
  }

  return series;
}

export function getAnomalyScoreSeries(data: RectCoordinate[]) {
  return {
    title: 'Anomaly score',
    hideLegend: true,
    hideTooltipValue: true,
    data,
    type: 'areaMaxHeight',
    color: 'none',
    areaColor: rgba(colors.apmRed, 0.1)
  };
}

function getAnomalyBoundariesSeries(data: Coordinate[]) {
  return {
    title: 'Anomaly Boundaries',
    hideLegend: true,
    hideTooltipValue: true,
    data,
    type: 'area',
    color: 'none',
    areaColor: rgba(colors.apmBlue, 0.1)
  };
}

export function getTpmSeries(
  apmTimeseries: ApmTimeSeriesResponse,
  transactionType?: string
) {
  const { tpmBuckets } = apmTimeseries;
  const bucketKeys = tpmBuckets.map(({ key }) => key);
  const getColor = getColorByKey(bucketKeys);
  const getTpmLegendTitle = (bucketKey: string) => {
    // hide legend text for transactions without "result"
    if (bucketKey === 'transaction_result_missing') {
      return '';
    }

    return bucketKey;
  };

  return tpmBuckets.map(bucket => {
    const avg = mean(bucket.dataPoints.map(p => p.y));
    return {
      title: getTpmLegendTitle(bucket.key),
      data: bucket.dataPoints,
      legendValue: `${asDecimal(avg)} ${tpmUnit(transactionType || '')}`,
      type: 'line',
      color: getColor(bucket.key)
    };
  });
}

function getColorByKey(keys: string[]) {
  const assignedColors: StringMap<string> = {
    'HTTP 2xx': colors.apmGreen,
    'HTTP 3xx': colors.apmYellow,
    'HTTP 4xx': colors.apmOrange,
    'HTTP 5xx': colors.apmRed2
  };

  const unknownKeys = difference(keys, Object.keys(assignedColors));
  const unassignedColors: StringMap<string> = zipObject(unknownKeys, [
    colors.apmBlue,
    colors.apmPurple,
    colors.apmPink,
    colors.apmTan,
    colors.apmRed,
    colors.apmBrown
  ]);

  return (key: string) => assignedColors[key] || unassignedColors[key];
}
