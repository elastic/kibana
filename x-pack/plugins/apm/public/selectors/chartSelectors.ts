/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import theme from '@elastic/eui/dist/eui_theme_light.json';
import { i18n } from '@kbn/i18n';
import { difference, zipObject } from 'lodash';
import { rgba } from 'polished';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { TimeSeriesAPIResponse } from '../../server/lib/transactions/charts';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ApmTimeSeriesResponse } from '../../server/lib/transactions/charts/get_timeseries_data/transform';
import {
  Coordinate,
  RectCoordinate,
  TimeSeries,
} from '../../typings/timeseries';
import { asDecimal, asDuration, tpmUnit } from '../utils/formatters';
import { IUrlParams } from '../context/UrlParamsContext/types';
import { getEmptySeries } from '../components/shared/charts/CustomPlot/getEmptySeries';
import { httpStatusCodeToColor } from '../utils/httpStatusCodeToColor';

export interface ITpmBucket {
  title: string;
  data: Coordinate[];
  legendValue: string;
  type: string;
  color: string;
}

export interface ITransactionChartData {
  tpmSeries: ITpmBucket[];
  responseTimeSeries: TimeSeries[];
  mlJobId: string | undefined;
}

const INITIAL_DATA = {
  apmTimeseries: {
    responseTimes: {
      avg: [],
      p95: [],
      p99: [],
    },
    tpmBuckets: [],
    overallAvgDuration: null,
  },
  anomalyTimeseries: undefined,
};

export function getTransactionCharts(
  { transactionType }: IUrlParams,
  { apmTimeseries, anomalyTimeseries }: TimeSeriesAPIResponse = INITIAL_DATA
): ITransactionChartData {
  const tpmSeries = getTpmSeries(apmTimeseries, transactionType);

  const responseTimeSeries = getResponseTimeSeries({
    apmTimeseries,
    anomalyTimeseries,
  });

  return {
    tpmSeries,
    responseTimeSeries,
    mlJobId: anomalyTimeseries?.jobId,
  };
}

export function getResponseTimeSeries({
  apmTimeseries,
  anomalyTimeseries,
}: TimeSeriesAPIResponse) {
  const { overallAvgDuration } = apmTimeseries;
  const { avg, p95, p99 } = apmTimeseries.responseTimes;

  const series: TimeSeries[] = [
    {
      title: i18n.translate('xpack.apm.transactions.chart.averageLabel', {
        defaultMessage: 'Avg.',
      }),
      data: avg,
      legendValue: asDuration(overallAvgDuration),
      type: 'linemark',
      color: theme.euiColorVis1,
    },
    {
      title: i18n.translate(
        'xpack.apm.transactions.chart.95thPercentileLabel',
        {
          defaultMessage: '95th percentile',
        }
      ),
      titleShort: '95th',
      data: p95,
      type: 'linemark',
      color: theme.euiColorVis5,
    },
    {
      title: i18n.translate(
        'xpack.apm.transactions.chart.99thPercentileLabel',
        {
          defaultMessage: '99th percentile',
        }
      ),
      titleShort: '99th',
      data: p99,
      type: 'linemark',
      color: theme.euiColorVis7,
    },
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
      defaultMessage: 'Anomaly score',
    }),
    hideLegend: true,
    hideTooltipValue: true,
    data,
    type: 'areaMaxHeight',
    color: 'none',
    areaColor: rgba(theme.euiColorVis9, 0.1),
  };
}

function getAnomalyBoundariesSeries(data: Coordinate[]) {
  return {
    title: i18n.translate(
      'xpack.apm.transactions.chart.anomalyBoundariesLabel',
      {
        defaultMessage: 'Anomaly Boundaries',
      }
    ),
    hideLegend: true,
    hideTooltipValue: true,
    data,
    type: 'area',
    color: 'none',
    areaColor: rgba(theme.euiColorVis1, 0.1),
  };
}

export function getTpmSeries(
  apmTimeseries: ApmTimeSeriesResponse,
  transactionType?: string
) {
  const { tpmBuckets } = apmTimeseries;
  const bucketKeys = tpmBuckets.map(({ key }) => key);
  const getColor = getColorByKey(bucketKeys);

  const { avg } = apmTimeseries.responseTimes;

  if (!tpmBuckets.length && avg.length) {
    const start = avg[0].x;
    const end = avg[avg.length - 1].x;
    return getEmptySeries(start, end);
  }

  return tpmBuckets.map((bucket) => {
    return {
      title: bucket.key,
      data: bucket.dataPoints,
      legendValue: `${asDecimal(bucket.avg)} ${tpmUnit(transactionType || '')}`,
      type: 'linemark',
      color: getColor(bucket.key),
    };
  });
}

function colorMatch(key: string) {
  if (/ok|success/i.test(key)) {
    return theme.euiColorSecondary;
  } else if (/error|fail/i.test(key)) {
    return theme.euiColorDanger;
  }
}

function getColorByKey(keys: string[]) {
  const assignedColors = ['HTTP 2xx', 'HTTP 3xx', 'HTTP 4xx', 'HTTP 5xx'];

  const unknownKeys = difference(keys, assignedColors);
  const unassignedColors: Record<string, string> = zipObject(unknownKeys, [
    theme.euiColorVis1,
    theme.euiColorVis3,
    theme.euiColorVis4,
    theme.euiColorVis6,
    theme.euiColorVis2,
    theme.euiColorVis8,
  ]);

  return (key: string) =>
    colorMatch(key) || httpStatusCodeToColor(key) || unassignedColors[key];
}
