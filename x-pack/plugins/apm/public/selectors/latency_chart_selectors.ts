/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Fit } from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import { rgba } from 'polished';
import { EuiTheme } from '../../../../../src/plugins/kibana_react/common';
import { asDuration } from '../../common/utils/formatters';
import { APMChartSpec, Coordinate } from '../../typings/timeseries';
import { APIReturnType } from '../services/rest/createCallApmApi';

export type LatencyChartsResponse =
  APIReturnType<'GET /api/apm/services/{serviceName}/transactions/charts/latency'>;

export interface LatencyChartData {
  currentPeriod?: APMChartSpec<Coordinate>;
  previousPeriod?: APMChartSpec<Coordinate>;
  mlJobId?: string;
  anomalyTimeseries?: { boundaries: APMChartSpec[]; scores: APMChartSpec };
}

export function getLatencyChartSelector({
  latencyChart,
  theme,
  latencyAggregationType,
}: {
  latencyChart?: LatencyChartsResponse;
  theme: EuiTheme;
  latencyAggregationType?: string;
}): Partial<LatencyChartData> {
  if (
    !latencyChart?.currentPeriod.latencyTimeseries ||
    !latencyAggregationType
  ) {
    return {};
  }
  return {
    currentPeriod: getLatencyTimeseries({
      latencyChart: latencyChart.currentPeriod,
      theme,
      latencyAggregationType,
    }),
    previousPeriod: getPreviousPeriodTimeseries({
      previousPeriod: latencyChart.previousPeriod,
      theme,
    }),
    mlJobId: latencyChart.anomalyTimeseries?.jobId,
    anomalyTimeseries: getAnomalyTimeseries({
      anomalyTimeseries: latencyChart.anomalyTimeseries,
      theme,
    }),
  };
}

function getPreviousPeriodTimeseries({
  previousPeriod,
  theme,
}: {
  previousPeriod: LatencyChartsResponse['previousPeriod'];
  theme: EuiTheme;
}) {
  return {
    data: previousPeriod.latencyTimeseries ?? [],
    type: 'area',
    color: theme.eui.euiColorMediumShade,
    title: i18n.translate(
      'xpack.apm.serviceOverview.latencyChartTitle.previousPeriodLabel',
      { defaultMessage: 'Previous period' }
    ),
  };
}

function getLatencyTimeseries({
  latencyChart,
  theme,
  latencyAggregationType,
}: {
  latencyChart: LatencyChartsResponse['currentPeriod'];
  theme: EuiTheme;
  latencyAggregationType: string;
}) {
  const { overallAvgDuration } = latencyChart;
  const { latencyTimeseries } = latencyChart;

  switch (latencyAggregationType) {
    case 'avg': {
      return {
        title: i18n.translate(
          'xpack.apm.transactions.latency.chart.averageLabel',
          { defaultMessage: 'Average' }
        ),
        data: latencyTimeseries,
        legendValue: asDuration(overallAvgDuration),
        type: 'linemark',
        color: theme.eui.euiColorVis1,
      };
    }
    case 'p95': {
      return {
        title: i18n.translate(
          'xpack.apm.transactions.latency.chart.95thPercentileLabel',
          { defaultMessage: '95th percentile' }
        ),
        titleShort: '95th',
        data: latencyTimeseries,
        type: 'linemark',
        color: theme.eui.euiColorVis5,
      };
    }
    case 'p99': {
      return {
        title: i18n.translate(
          'xpack.apm.transactions.latency.chart.99thPercentileLabel',
          { defaultMessage: '99th percentile' }
        ),
        titleShort: '99th',
        data: latencyTimeseries,
        type: 'linemark',
        color: theme.eui.euiColorVis7,
      };
    }
  }
}

function getAnomalyTimeseries({
  anomalyTimeseries,
  theme,
}: {
  anomalyTimeseries: LatencyChartsResponse['anomalyTimeseries'];
  theme: EuiTheme;
}): { boundaries: APMChartSpec[]; scores: APMChartSpec } | undefined {
  if (!anomalyTimeseries) {
    return undefined;
  }

  const boundariesConfigBase = {
    type: 'area',
    fit: Fit.Lookahead,
    hideLegend: true,
    hideTooltipValue: true,
    stackAccessors: ['y'],
    areaSeriesStyle: {
      point: {
        opacity: 0,
      },
    },
  };

  const boundaries = [
    {
      ...boundariesConfigBase,
      title: 'anomalyBoundariesLower',
      data: anomalyTimeseries.anomalyBoundaries.map((coord) => ({
        x: coord.x,
        y: coord.y0,
      })),
      color: rgba(0, 0, 0, 0),
    },
    {
      ...boundariesConfigBase,
      title: 'anomalyBoundariesUpper',
      data: anomalyTimeseries.anomalyBoundaries.map((coord) => ({
        x: coord.x,
        y: coord.y - coord.y0,
      })),
      color: rgba(theme.eui.euiColorVis1, 0.5),
    },
  ];

  const scores = {
    title: 'anomalyScores',
    type: 'rectAnnotation',
    data: anomalyTimeseries.anomalyScore,
    color: theme.eui.euiColorVis9,
  };

  return { boundaries, scores };
}
