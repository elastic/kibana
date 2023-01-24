/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { usePreviousPeriodLabel } from '../../../hooks/use_previous_period_text';
import { isTimeComparison } from '../time_comparison/get_comparison_options';
import { asPercent } from '../../../../common/utils/formatters';
import { useFetcher } from '../../../hooks/use_fetcher';
import { useTimeRange } from '../../../hooks/use_time_range';
import { Coordinate, TimeSeries } from '../../../../typings/timeseries';
import { TimeseriesChartWithContext } from '../charts/timeseries_chart_with_context';
import {
  ChartType,
  getTimeSeriesColor,
} from '../charts/helper/get_timeseries_color';
import { getComparisonChartTheme } from '../time_comparison/get_comparison_chart_theme';
import { DependencyMetricChartsRouteParams } from './dependency_metric_charts_route_params';
import { useSearchServiceDestinationMetrics } from '../../../context/time_range_metadata/use_search_service_destination_metrics';

function yLabelFormat(y?: number | null) {
  return asPercent(y || 0, 1);
}

export function DependencyFailedTransactionRateChart({
  height,
  dependencyName,
  kuery,
  environment,
  rangeFrom,
  rangeTo,
  offset,
  comparisonEnabled,
  spanName,
}: {
  height: number;
} & DependencyMetricChartsRouteParams) {
  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const comparisonChartTheme = getComparisonChartTheme();

  const { isTimeRangeMetadataLoading, searchServiceDestinationMetrics } =
    useSearchServiceDestinationMetrics({ rangeFrom, rangeTo, kuery });

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (isTimeRangeMetadataLoading) {
        return;
      }

      return callApmApi('GET /internal/apm/dependencies/charts/error_rate', {
        params: {
          query: {
            dependencyName,
            start,
            end,
            offset:
              comparisonEnabled && isTimeComparison(offset)
                ? offset
                : undefined,
            kuery,
            environment,
            spanName: spanName || '',
            searchServiceDestinationMetrics,
          },
        },
      });
    },
    [
      dependencyName,
      start,
      end,
      offset,
      kuery,
      environment,
      comparisonEnabled,
      spanName,
      isTimeRangeMetadataLoading,
      searchServiceDestinationMetrics,
    ]
  );

  const { currentPeriodColor, previousPeriodColor } = getTimeSeriesColor(
    ChartType.FAILED_TRANSACTION_RATE
  );

  const previousPeriodLabel = usePreviousPeriodLabel();
  const timeseries = useMemo(() => {
    const specs: Array<TimeSeries<Coordinate>> = [];

    if (data?.currentTimeseries) {
      specs.push({
        data: data.currentTimeseries,
        type: 'linemark',
        color: currentPeriodColor,
        title: i18n.translate('xpack.apm.dependencyErrorRateChart.chartTitle', {
          defaultMessage: 'Failed transaction rate',
        }),
      });
    }

    if (data?.comparisonTimeseries) {
      specs.push({
        data: data.comparisonTimeseries,
        type: 'area',
        color: previousPeriodColor,
        title: previousPeriodLabel,
      });
    }

    return specs;
  }, [data, currentPeriodColor, previousPeriodColor, previousPeriodLabel]);

  return (
    <TimeseriesChartWithContext
      height={height}
      fetchStatus={status}
      id="errorRateChart"
      customTheme={comparisonChartTheme}
      timeseries={timeseries}
      yLabelFormat={yLabelFormat}
    />
  );
}
