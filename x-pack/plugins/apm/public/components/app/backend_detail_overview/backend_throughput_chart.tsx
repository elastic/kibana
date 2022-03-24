/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { asTransactionRate } from '../../../../common/utils/formatters';
import { useFetcher } from '../../../hooks/use_fetcher';
import { useTimeRange } from '../../../hooks/use_time_range';
import { Coordinate, TimeSeries } from '../../../../typings/timeseries';
import { TimeseriesChart } from '../../shared/charts/timeseries_chart';
import { useApmParams } from '../../../hooks/use_apm_params';
import {
  ChartType,
  getTimeSeriesColor,
} from '../../shared/charts/helper/get_timeseries_color';
import {
  getComparisonChartTheme,
  getTimeRangeComparison,
} from '../../shared/time_comparison/get_time_range_comparison';

export function BackendThroughputChart({ height }: { height: number }) {
  const {
    query: {
      backendName,
      rangeFrom,
      rangeTo,
      kuery,
      environment,
      comparisonEnabled,
      comparisonType,
    },
  } = useApmParams('/backends/overview');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const comparisonChartTheme = getComparisonChartTheme();
  const { offset } = getTimeRangeComparison({
    start,
    end,
    comparisonType,
    comparisonEnabled,
  });

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (!start || !end) {
        return;
      }

      return callApmApi('GET /internal/apm/backends/charts/throughput', {
        params: {
          query: {
            backendName,
            start,
            end,
            offset,
            kuery,
            environment,
          },
        },
      });
    },
    [backendName, start, end, offset, kuery, environment]
  );

  const { currentPeriodColor, previousPeriodColor } = getTimeSeriesColor(
    ChartType.THROUGHPUT
  );

  const timeseries = useMemo(() => {
    const specs: Array<TimeSeries<Coordinate>> = [];

    if (data?.currentTimeseries) {
      specs.push({
        data: data.currentTimeseries,
        type: 'linemark',
        color: currentPeriodColor,
        title: i18n.translate('xpack.apm.backendThroughputChart.chartTitle', {
          defaultMessage: 'Throughput',
        }),
      });
    }

    if (data?.comparisonTimeseries) {
      specs.push({
        data: data.comparisonTimeseries,
        type: 'area',
        color: previousPeriodColor,
        title: i18n.translate(
          'xpack.apm.backendThroughputChart.previousPeriodLabel',
          { defaultMessage: 'Previous period' }
        ),
      });
    }

    return specs;
  }, [data, currentPeriodColor, previousPeriodColor]);

  return (
    <TimeseriesChart
      height={height}
      fetchStatus={status}
      id="throughputChart"
      customTheme={comparisonChartTheme}
      timeseries={timeseries}
      yLabelFormat={asTransactionRate}
    />
  );
}
