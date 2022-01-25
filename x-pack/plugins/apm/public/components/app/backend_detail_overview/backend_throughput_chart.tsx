/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { asTransactionRate } from '../../../../common/utils/formatters';
import { useComparison } from '../../../hooks/use_comparison';
import { useFetcher } from '../../../hooks/use_fetcher';
import { useTimeRange } from '../../../hooks/use_time_range';
import { Coordinate, TimeSeries } from '../../../../typings/timeseries';
import { TimeseriesChart } from '../../shared/charts/timeseries_chart';
import { useTheme } from '../../../hooks/use_theme';
import { useApmParams } from '../../../hooks/use_apm_params';

export function BackendThroughputChart({ height }: { height: number }) {
  const theme = useTheme();

  const {
    query: { backendName, rangeFrom, rangeTo, kuery, environment },
  } = useApmParams('/backends/overview');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { offset, comparisonChartTheme } = useComparison();

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

  const timeseries = useMemo(() => {
    const specs: Array<TimeSeries<Coordinate>> = [];

    if (data?.currentTimeseries) {
      specs.push({
        data: data.currentTimeseries,
        type: 'linemark',
        color: theme.eui.euiColorVis0,
        title: i18n.translate('xpack.apm.backendThroughputChart.chartTitle', {
          defaultMessage: 'Throughput',
        }),
      });
    }

    if (data?.comparisonTimeseries) {
      specs.push({
        data: data.comparisonTimeseries,
        type: 'area',
        color: theme.eui.euiColorMediumShade,
        title: i18n.translate(
          'xpack.apm.backendThroughputChart.previousPeriodLabel',
          { defaultMessage: 'Previous period' }
        ),
      });
    }

    return specs;
  }, [data, theme.eui.euiColorVis0, theme.eui.euiColorMediumShade]);

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
