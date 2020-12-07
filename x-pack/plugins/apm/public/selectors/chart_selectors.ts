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
import { IUrlParams } from '../context/url_params_context/types';
import { getEmptySeries } from '../components/shared/charts/helper/get_empty_series';
import { httpStatusCodeToColor } from '../utils/httpStatusCodeToColor';
import { asDuration, asTransactionRate } from '../../common/utils/formatters';

export interface ITpmBucket {
  title: string;
  data: Coordinate[];
  legendValue: string;
  type: string;
  color: string;
}

export interface AnomalySeries {
  scores: TimeSeries;
  bounderies: TimeSeries;
}

export interface ITransactionChartData {
  tpmSeries?: ITpmBucket[];
  responseTimeSeries?: TimeSeries[];
  mlJobId: string | undefined;
  anomalySeries?: AnomalySeries;
}

const INITIAL_DATA: Partial<TimeSeriesAPIResponse> = {
  apmTimeseries: undefined,
  anomalyTimeseries: undefined,
};

export function getTransactionCharts(
  { transactionType }: IUrlParams,
  charts = INITIAL_DATA
): ITransactionChartData {
  const { apmTimeseries, anomalyTimeseries } = charts;

  const transactionCharts: ITransactionChartData = {
    tpmSeries: undefined,
    responseTimeSeries: undefined,
    mlJobId: anomalyTimeseries?.jobId,
  };

  if (apmTimeseries) {
    transactionCharts.tpmSeries = getTpmSeries(apmTimeseries, transactionType);

    transactionCharts.responseTimeSeries = getResponseTimeSeries({
      apmTimeseries,
    });

    transactionCharts.anomalySeries = getResponseTimeAnnomalySeries({
      anomalyTimeseries,
    });
  }
  return transactionCharts;
}

function getResponseTimeAnnomalySeries({
  anomalyTimeseries,
}: {
  anomalyTimeseries: TimeSeriesAPIResponse['anomalyTimeseries'];
}): AnomalySeries | undefined {
  if (anomalyTimeseries) {
    return {
      bounderies: getAnomalyBoundariesSeries(
        anomalyTimeseries.anomalyBoundaries
      ),
      scores: getAnomalyScoreSeries(anomalyTimeseries.anomalyScore),
    };
  }
}

export function getResponseTimeSeries({
  apmTimeseries,
}: {
  apmTimeseries: TimeSeriesAPIResponse['apmTimeseries'];
}) {
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

  return series;
}

export function getAnomalyScoreSeries(data: RectCoordinate[]) {
  return {
    title: i18n.translate('xpack.apm.transactions.chart.anomalyScoreLabel', {
      defaultMessage: 'Anomaly score',
    }),
    data,
    type: 'rectAnnotation',
    color: theme.euiColorVis9,
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
    data,
    type: 'area',
    color: rgba(theme.euiColorVis1, 0.5),
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
      legendValue: asTransactionRate(bucket.avg),
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
