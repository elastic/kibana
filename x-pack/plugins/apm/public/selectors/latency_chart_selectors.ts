/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { rgba } from 'polished';
import { EuiTheme } from '../../../observability/public';
import { asDuration } from '../../common/utils/formatters';
import {
  Coordinate,
  RectCoordinate,
  TimeSeries,
} from '../../typings/timeseries';
import { APIReturnType } from '../services/rest/createCallApmApi';

export type LatencyChartsResponse = APIReturnType<'GET /api/apm/services/{serviceName}/transactions/charts/latency'>;

interface LatencyChart {
  latencyTimeseries: TimeSeries[];
  mlJobId?: string;
  anomalyTimeseries?: {
    bounderies: TimeSeries;
    scores: TimeSeries;
  };
}

export function getLatencyChartSelector({
  latencyChart,
  theme,
}: {
  latencyChart?: LatencyChartsResponse;
  theme: EuiTheme;
}): LatencyChart {
  if (!latencyChart) {
    return {
      latencyTimeseries: [],
      mlJobId: undefined,
      anomalyTimeseries: undefined,
    };
  }
  return {
    latencyTimeseries: getLatencyTimeseries({ latencyChart, theme }),
    mlJobId: latencyChart.anomalyTimeseries?.jobId,
    anomalyTimeseries: getAnnomalyTimeseries({
      anomalyTimeseries: latencyChart.anomalyTimeseries,
      theme,
    }),
  };
}

function getLatencyTimeseries({
  latencyChart,
  theme,
}: {
  latencyChart: LatencyChartsResponse;
  theme: EuiTheme;
}) {
  const { overallAvgDuration } = latencyChart;
  const { avg, p95, p99 } = latencyChart.latencyTimeseries;

  const series = [
    {
      title: i18n.translate(
        'xpack.apm.transactions.latency.chart.averageLabel',
        {
          defaultMessage: 'Avg.',
        }
      ),
      data: avg,
      legendValue: asDuration(overallAvgDuration),
      type: 'linemark',
      color: theme.eui.euiColorVis1,
    },
    {
      title: i18n.translate(
        'xpack.apm.transactions.latency.chart.95thPercentileLabel',
        {
          defaultMessage: '95th percentile',
        }
      ),
      titleShort: '95th',
      data: p95,
      type: 'linemark',
      color: theme.eui.euiColorVis5,
    },
    {
      title: i18n.translate(
        'xpack.apm.transactions.latency.chart.99thPercentileLabel',
        {
          defaultMessage: '99th percentile',
        }
      ),
      titleShort: '99th',
      data: p99,
      type: 'linemark',
      color: theme.eui.euiColorVis7,
    },
  ];

  return series;
}

function getAnnomalyTimeseries({
  anomalyTimeseries,
  theme,
}: {
  anomalyTimeseries: LatencyChartsResponse['anomalyTimeseries'];
  theme: EuiTheme;
}) {
  if (anomalyTimeseries) {
    return {
      bounderies: getAnomalyBoundariesSeries(
        anomalyTimeseries.anomalyBoundaries,
        theme
      ),
      scores: getAnomalyScoreSeries(anomalyTimeseries.anomalyScore, theme),
    };
  }
}

export function getAnomalyScoreSeries(data: RectCoordinate[], theme: EuiTheme) {
  return {
    title: i18n.translate('xpack.apm.transactions.chart.anomalyScoreLabel', {
      defaultMessage: 'Anomaly score',
    }),
    data,
    type: 'rectAnnotation',
    color: theme.eui.euiColorVis9,
  };
}

function getAnomalyBoundariesSeries(data: Coordinate[], theme: EuiTheme) {
  return {
    title: i18n.translate(
      'xpack.apm.transactions.chart.anomalyBoundariesLabel',
      {
        defaultMessage: 'Anomaly Boundaries',
      }
    ),
    data,
    type: 'area',
    color: rgba(theme.eui.euiColorVis1, 0.5),
  };
}
