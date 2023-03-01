/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { groupBy, mapValues } from 'lodash';
import React from 'react';
import { ApmMlDetectorType } from '../../../../common/anomaly_detection/apm_ml_detectors';
import { ApmMlModule } from '../../../../common/anomaly_detection/apm_ml_module';
import { isDefaultTransactionType } from '../../../../common/transaction_types';
import {
  asDuration,
  asExactTransactionRate,
  asPercent,
} from '../../../../common/utils/formatters';
import { ChartType } from '../charts/helper/get_timeseries_color';
import { ServiceSummaryTimeseriesChart } from './service_summary_timeseries_chart';
import { useServiceSummaryAnomalyFetcher } from './use_service_summary_anomaly_fetcher';
import { useServiceTransactionSummaryFetcher } from './use_service_transaction_summary_fetcher';

interface Props {
  transactionSummaryFetch: ReturnType<
    typeof useServiceTransactionSummaryFetcher
  >;
  anomalySummaryFetch: ReturnType<typeof useServiceSummaryAnomalyFetcher>;
}

export function ServiceSummaryTransactionCharts({
  transactionSummaryFetch,
  anomalySummaryFetch,
}: Props) {
  const anomalyTimeseriesByDetector = mapValues(
    groupBy(
      anomalySummaryFetch.data?.anomalies.filter(
        (stat) => stat.job.module === ApmMlModule.Transaction
      ),
      'type'
    ),
    (stats) =>
      stats.find((stat) => isDefaultTransactionType(stat.by) || stats[0])!
  );

  return (
    <EuiFlexGroup direction="row">
      <EuiFlexItem>
        <ServiceSummaryTimeseriesChart
          chartType={ChartType.LATENCY_AVG}
          data={transactionSummaryFetch.data?.stats.latency.timeseries}
          dataFetchStatus={transactionSummaryFetch.status}
          id="service_summary_tx_latency"
          title={i18n.translate(
            'xpack.serviceSummaryTransactionCharts.latency',
            { defaultMessage: 'Latency' }
          )}
          yLabelFormat={asDuration}
          anomalyTimeseries={
            anomalyTimeseriesByDetector[ApmMlDetectorType.txLatency]
          }
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <ServiceSummaryTimeseriesChart
          chartType={ChartType.THROUGHPUT}
          data={transactionSummaryFetch.data?.stats.throughput.timeseries}
          dataFetchStatus={transactionSummaryFetch.status}
          id="service_summary_tx_throughput"
          title={i18n.translate(
            'xpack.serviceSummaryTransactionCharts.throughput',
            { defaultMessage: 'Throughput' }
          )}
          yLabelFormat={asExactTransactionRate}
          anomalyTimeseries={
            anomalyTimeseriesByDetector[ApmMlDetectorType.txThroughput]
          }
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <ServiceSummaryTimeseriesChart
          chartType={ChartType.FAILED_TRANSACTION_RATE}
          data={transactionSummaryFetch.data?.stats.failureRate.timeseries}
          dataFetchStatus={transactionSummaryFetch.status}
          id="service_summary_tx_failure_rate"
          title={i18n.translate(
            'xpack.serviceSummaryTransactionCharts.failureRate',
            { defaultMessage: 'Failure rate' }
          )}
          yLabelFormat={(y) => (y === null ? '' : asPercent(y, 1))}
          anomalyTimeseries={
            anomalyTimeseriesByDetector[ApmMlDetectorType.txFailureRate]
          }
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
