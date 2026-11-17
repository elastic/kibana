/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeKuery } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { useMemo } from 'react';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { useRequestFlyoutFetcher } from '../use_request_flyout_fetcher';
import { ChartType, getTimeSeriesColor } from '../../charts/helper/get_timeseries_color';
import { useRequestFlyoutContext } from '../request_flyout_context';

type Timeseries = Array<{ x: number; y: number | null }>;

const toSeries = (data: Timeseries | undefined, chartType: ChartType, title: string) =>
  data
    ? [
        {
          data,
          type: 'linemark' as const,
          color: getTimeSeriesColor(chartType).currentPeriodColor,
          title,
        },
      ]
    : [];

/**
 * Charts and trace samples of an operation (an exit span name) of the source service on a
 * dependency. The page of the operation reads route params, so this calls the same routes.
 */
export function useOperationDetail({
  spanName,
  dependencyName,
}: {
  spanName: string;
  dependencyName: string;
}) {
  const {
    connection: { sourceServiceName },
    filters: { environment, start, end },
  } = useRequestFlyoutContext();

  const kuery = `service.name : "${escapeKuery(sourceServiceName)}"`;
  const query = useMemo(
    () => ({ dependencyName, spanName, environment, start, end, kuery }),
    [dependencyName, spanName, environment, start, end, kuery]
  );

  const { data: latency, status: latencyStatus } = useRequestFlyoutFetcher(
    (callApmApi) =>
      callApmApi('GET /internal/apm/dependencies/charts/latency', {
        params: { query },
      }),
    [query]
  );
  const { data: throughput, status: throughputStatus } = useRequestFlyoutFetcher(
    (callApmApi) =>
      callApmApi('GET /internal/apm/dependencies/charts/throughput', {
        params: { query },
      }),
    [query]
  );
  const { data: errorRate, status: errorRateStatus } = useRequestFlyoutFetcher(
    (callApmApi) =>
      callApmApi('GET /internal/apm/dependencies/charts/error_rate', {
        params: { query },
      }),
    [query]
  );
  const { data: samples, status: samplesStatus } = useRequestFlyoutFetcher(
    (callApmApi) =>
      callApmApi('GET /internal/apm/dependencies/operations/spans', {
        params: { query },
      }),
    [query]
  );

  const latencySeries = useMemo(
    () =>
      toSeries(
        latency?.currentTimeseries,
        ChartType.LATENCY_AVG,
        i18n.translate('xpack.apm.requestFlyout.operationDetail.latencySeries', {
          defaultMessage: 'Latency',
        })
      ),
    [latency]
  );
  const throughputSeries = useMemo(
    () =>
      toSeries(
        throughput?.currentTimeseries,
        ChartType.THROUGHPUT,
        i18n.translate('xpack.apm.requestFlyout.operationDetail.throughputSeries', {
          defaultMessage: 'Throughput',
        })
      ),
    [throughput]
  );
  const errorRateSeries = useMemo(
    () =>
      toSeries(
        errorRate?.currentTimeseries,
        ChartType.FAILED_TRANSACTION_RATE,
        i18n.translate('xpack.apm.requestFlyout.operationDetail.failedRateSeries', {
          defaultMessage: 'Failed',
        })
      ),
    [errorRate]
  );
  const spans = useMemo(() => samples?.spans ?? [], [samples]);

  return {
    kuery,
    latencySeries,
    latencyStatus,
    throughputSeries,
    throughputStatus,
    errorRateSeries,
    errorRateStatus,
    spans,
    samplesStatus,
    hasError: [latencyStatus, throughputStatus, errorRateStatus, samplesStatus].includes(
      FETCH_STATUS.FAILURE
    ),
  };
}
