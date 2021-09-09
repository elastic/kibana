/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { asPercent } from '../../../../common/utils/formatters';
import { useApmBackendContext } from '../../../context/apm_backend/use_apm_backend_context';
import { useComparison } from '../../../hooks/use_comparison';
import { useFetcher } from '../../../hooks/use_fetcher';
import { useTimeRange } from '../../../hooks/use_time_range';
import { Coordinate, TimeSeries } from '../../../../typings/timeseries';
import { TimeseriesChart } from '../../shared/charts/timeseries_chart';
import { useTheme } from '../../../hooks/use_theme';
import { useApmParams } from '../../../hooks/use_apm_params';

function yLabelFormat(y?: number | null) {
  return asPercent(y || 0, 1);
}

export function BackendFailedTransactionRateChart({
  height,
}: {
  height: number;
}) {
  const { backendName } = useApmBackendContext();

  const theme = useTheme();

  const {
    query: { kuery, environment, rangeFrom, rangeTo },
  } = useApmParams('/backends/{backendName}/overview');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { offset, comparisonChartTheme } = useComparison();

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (!start || !end) {
        return;
      }

      return callApmApi({
        endpoint: 'GET /api/apm/backends/{backendName}/charts/error_rate',
        params: {
          path: {
            backendName,
          },
          query: {
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
        color: theme.eui.euiColorVis7,
        title: i18n.translate('xpack.apm.backendErrorRateChart.chartTitle', {
          defaultMessage: 'Failed transaction rate',
        }),
      });
    }

    if (data?.comparisonTimeseries) {
      specs.push({
        data: data.comparisonTimeseries,
        type: 'area',
        color: theme.eui.euiColorMediumShade,
        title: i18n.translate(
          'xpack.apm.backendErrorRateChart.previousPeriodLabel',
          { defaultMessage: 'Previous period' }
        ),
      });
    }

    return specs;
  }, [data, theme.eui.euiColorVis7, theme.eui.euiColorMediumShade]);

  return (
    <TimeseriesChart
      height={height}
      fetchStatus={status}
      id="errorRateChart"
      customTheme={comparisonChartTheme}
      timeseries={timeseries}
      yLabelFormat={yLabelFormat}
    />
  );
}
