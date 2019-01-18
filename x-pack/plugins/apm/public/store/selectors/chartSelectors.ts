/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
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
import {
  asDecimal,
  asMillis,
  asPercent,
  tpmUnit
} from '../../utils/formatters';
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

interface IEmptySeries {
  data: Coordinate[];
}

export interface ITpmBucket {
  title: string;
  data: Coordinate[];
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
  series: TimeSerie[] | IEmptySeries[];
}

export function getMemorySeries(
  urlParams: IUrlParams,
  memoryChartResponse: MetricsChartAPIResponse['memory']
) {
  const { start, end } = urlParams;
  const { series, overallValues, totalHits } = memoryChartResponse;
  const seriesList: IMemoryChartData['series'] =
    totalHits === 0
      ? getEmptySerie(start, end)
      : [
          {
            title: i18n.translate(
              'xpack.apm.chart.memorySeries.systemMaxLabel',
              {
                defaultMessage: 'System max'
              }
            ),
            data: series.maximumPercentMemoryUsed,
            type: 'linemark',
            color: colors.apmBlue,
            legendValue: asPercent(
              overallValues.maximumPercentMemoryUsed || 0,
              1
            )
          },
          {
            title: i18n.translate(
              'xpack.apm.chart.memorySeries.systemAverageLabel',
              {
                defaultMessage: 'System average'
              }
            ),
            data: series.averagePercentMemoryUsed,
            type: 'linemark',
            color: colors.apmGreen,
            legendValue: asPercent(
              overallValues.averagePercentMemoryUsed || 0,
              1
            )
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
      title: i18n.translate('xpack.apm.chart.cpuSeries.systemMaxLabel', {
        defaultMessage: 'System max'
      }),
      data: series.systemCPUMax,
      type: 'linemark',
      color: colors.apmBlue,
      legendValue: asPercent(overallValues.systemCPUMax || 0, 1)
    },
    {
      title: i18n.translate('xpack.apm.chart.cpuSeries.systemAverageLabel', {
        defaultMessage: 'System average'
      }),
      data: series.systemCPUAverage,
      type: 'linemark',
      color: colors.apmGreen,
      legendValue: asPercent(overallValues.systemCPUAverage || 0, 1)
    },
    {
      title: i18n.translate('xpack.apm.chart.cpuSeries.processMaxLabel', {
        defaultMessage: 'Process max'
      }),
      data: series.processCPUMax,
      type: 'linemark',
      color: colors.apmOrange,
      legendValue: asPercent(overallValues.processCPUMax || 0, 1)
    },
    {
      title: i18n.translate('xpack.apm.chart.cpuSeries.processAverageLabel', {
        defaultMessage: 'Process average'
      }),
      data: series.processCPUAverage,
      type: 'linemark',
      color: colors.apmYellow,
      legendValue: asPercent(overallValues.processCPUAverage || 0, 1)
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
      title: i18n.translate('xpack.apm.transactions.chart.averageLabel', {
        defaultMessage: 'Avg.'
      }),
      data: avg,
      legendValue: asMillis(overallAvgDuration),
      type: 'linemark',
      color: colors.apmBlue
    },
    {
      title: i18n.translate(
        'xpack.apm.transactions.chart.95thPercentileLabel',
        {
          defaultMessage: '95th percentile'
        }
      ),
      titleShort: '95th',
      data: p95,
      type: 'linemark',
      color: colors.apmYellow
    },
    {
      title: i18n.translate(
        'xpack.apm.transactions.chart.99thPercentileLabel',
        {
          defaultMessage: '99th percentile'
        }
      ),
      titleShort: '99th',
      data: p99,
      type: 'linemark',
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
    title: i18n.translate('xpack.apm.transactions.chart.anomalyScoreLabel', {
      defaultMessage: 'Anomaly score'
    }),
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
    title: i18n.translate(
      'xpack.apm.transactions.chart.anomalyBoundariesLabel',
      {
        defaultMessage: 'Anomaly Boundaries'
      }
    ),
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
      type: 'linemark',
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
