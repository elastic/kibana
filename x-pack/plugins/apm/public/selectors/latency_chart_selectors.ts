/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { asDuration } from '../../common/utils/formatters';
import { APMChartSpec, Coordinate } from '../../typings/timeseries';
import {
  ChartType,
  getTimeSeriesColor,
} from '../components/shared/charts/helper/get_timeseries_color';
import { APIReturnType } from '../services/rest/create_call_apm_api';

export type LatencyChartsResponse =
  APIReturnType<'GET /internal/apm/services/{serviceName}/transactions/charts/latency'>;

export interface LatencyChartData {
  currentPeriod?: APMChartSpec<Coordinate>;
  previousPeriod?: APMChartSpec<Coordinate>;
}

export function getLatencyChartSelector({
  latencyChart,
  latencyAggregationType,
}: {
  latencyChart?: LatencyChartsResponse;
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
      latencyAggregationType,
    }),
    previousPeriod: getPreviousPeriodTimeseries({
      previousPeriod: latencyChart.previousPeriod,
      latencyAggregationType,
    }),
  };
}

function getPreviousPeriodTimeseries({
  previousPeriod,
  latencyAggregationType,
}: {
  previousPeriod: LatencyChartsResponse['previousPeriod'];
  latencyAggregationType: string;
}) {
  let chartType = ChartType.LATENCY_AVG;
  if (latencyAggregationType === 'p95') {
    chartType = ChartType.LATENCY_P95;
  } else if (latencyAggregationType === 'p99') {
    chartType = ChartType.LATENCY_P99;
  }

  const { previousPeriodColor } = getTimeSeriesColor(chartType);

  return {
    data: previousPeriod.latencyTimeseries ?? [],
    type: 'area',
    color: previousPeriodColor,
    title: i18n.translate(
      'xpack.apm.serviceOverview.latencyChartTitle.previousPeriodLabel',
      { defaultMessage: 'Previous period' }
    ),
  };
}

function getLatencyTimeseries({
  latencyChart,
  latencyAggregationType,
}: {
  latencyChart: LatencyChartsResponse['currentPeriod'];
  latencyAggregationType: string;
}) {
  const { overallAvgDuration } = latencyChart;
  const { latencyTimeseries } = latencyChart;

  switch (latencyAggregationType) {
    case 'avg': {
      const { currentPeriodColor } = getTimeSeriesColor(ChartType.LATENCY_AVG);
      return {
        title: i18n.translate(
          'xpack.apm.transactions.latency.chart.averageLabel',
          { defaultMessage: 'Average' }
        ),
        data: latencyTimeseries,
        legendValue: asDuration(overallAvgDuration),
        type: 'linemark',
        color: currentPeriodColor,
      };
    }
    case 'p95': {
      const { currentPeriodColor } = getTimeSeriesColor(ChartType.LATENCY_P95);
      return {
        title: i18n.translate(
          'xpack.apm.transactions.latency.chart.95thPercentileLabel',
          { defaultMessage: '95th percentile' }
        ),
        titleShort: '95th',
        data: latencyTimeseries,
        type: 'linemark',
        color: currentPeriodColor,
      };
    }
    case 'p99': {
      const { currentPeriodColor } = getTimeSeriesColor(ChartType.LATENCY_P99);
      return {
        title: i18n.translate(
          'xpack.apm.transactions.latency.chart.99thPercentileLabel',
          { defaultMessage: '99th percentile' }
        ),
        titleShort: '99th',
        data: latencyTimeseries,
        type: 'linemark',
        color: currentPeriodColor,
      };
    }
  }
}
