/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMemo } from 'react';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { useRequestFlyoutFetcher } from '../use_request_flyout_fetcher';
import { ChartType, getTimeSeriesColor } from '../../charts/helper/get_timeseries_color';
import { getLatencyChartType } from '../../service_flyout/overview/chart_configs/shared/chart_builders';
import { useRequestFlyoutContext } from '../request_flyout_context';
import type { LatencyAggregationType } from '../../../../../common/latency_aggregation_types';

/** RED metrics (latency, throughput, failed rate) of the calls of the source to the connection. */
export function useRequestFlyoutRedMetrics({
  latencyAggregationType,
}: {
  latencyAggregationType: LatencyAggregationType;
}) {
  const {
    connection: { sourceServiceName, dependencies },
    filters: { environment, start, end },
  } = useRequestFlyoutContext();

  const { data, status: fetchStatus } = useRequestFlyoutFetcher(
    (callApmApi) =>
      callApmApi('GET /internal/apm/service-map/dependency', {
        params: {
          query: {
            sourceServiceName,
            dependencies,
            environment,
            start,
            end,
            latencyAggregationType,
          },
        },
      }),
    [sourceServiceName, dependencies, environment, start, end, latencyAggregationType]
  );

  const { currentPeriodColor: throughputColor } = getTimeSeriesColor(ChartType.THROUGHPUT);
  const { currentPeriodColor: errorRateColor } = getTimeSeriesColor(
    ChartType.FAILED_TRANSACTION_RATE
  );
  const { currentPeriodColor: latencyColor } = getTimeSeriesColor(
    getLatencyChartType(latencyAggregationType)
  );

  const currentPeriod = data?.currentPeriod;

  const latencyTimeseries = useMemo(() => {
    const series = currentPeriod?.transactionStats?.latency?.timeseries;
    if (!series) return [];
    return [
      {
        data: series,
        type: 'linemark' as const,
        color: latencyColor,
        title: i18n.translate('xpack.apm.requestFlyout.latencySeriesTitle', {
          defaultMessage: 'Latency',
        }),
      },
    ];
  }, [currentPeriod, latencyColor]);

  const throughputTimeseries = useMemo(() => {
    const series = currentPeriod?.transactionStats?.throughput?.timeseries;
    if (!series) return [];
    return [
      {
        data: series,
        type: 'linemark' as const,
        color: throughputColor,
        title: i18n.translate('xpack.apm.requestFlyout.throughputSeriesTitle', {
          defaultMessage: 'Throughput',
        }),
      },
    ];
  }, [currentPeriod, throughputColor]);

  const errorRateTimeseries = useMemo(() => {
    const series = currentPeriod?.failedTransactionsRate?.timeseries;
    if (!series) return [];
    return [
      {
        data: series,
        type: 'linemark' as const,
        color: errorRateColor,
        title: i18n.translate('xpack.apm.requestFlyout.errorRateSeriesTitle', {
          defaultMessage: 'Failed transaction rate',
        }),
      },
    ];
  }, [currentPeriod, errorRateColor]);

  return {
    latencyTimeseries,
    throughputTimeseries,
    errorRateTimeseries,
    status: fetchStatus,
    hasError: fetchStatus === FETCH_STATUS.FAILURE,
  };
}
