/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel, EuiTitle, EuiIconTip, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect } from 'react';
import { usePreviousPeriodLabel } from '../../../hooks/use_previous_period_text';
import { isTimeComparison } from '../../shared/time_comparison/get_comparison_options';
import { AnomalyDetectorType } from '../../../../common/anomaly_detection/apm_ml_detectors';
import { asExactTransactionRate } from '../../../../common/utils/formatters';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { useEnvironmentsContext } from '../../../context/environments_context/use_environments_context';
import { useAnyOfApmParams } from '../../../hooks/use_apm_params';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { usePreferredServiceAnomalyTimeseries } from '../../../hooks/use_preferred_service_anomaly_timeseries';
import { useTimeRange } from '../../../hooks/use_time_range';
import { TimeseriesChartWithoutAppContext } from '../../shared/charts/timeseries_chart_with_context';
import { getComparisonChartTheme } from '../../shared/time_comparison/get_comparison_chart_theme';
import { ChartType, getTimeSeriesColor } from '../../shared/charts/helper/get_timeseries_color';
import {
  PreferredDataSourceAndBucketSize,
  usePreferredDataSourceAndBucketSize,
} from '../../../hooks/use_preferred_data_source_and_bucket_size';
import { ApmDocumentType } from '../../../../common/document_type';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { getThroughputScreenContext } from './get_throughput_screen_context';
import { Environment } from '../../../../common/environment_rt';
import { ServiceAnomalyTimeseries } from '../../../../common/anomaly_detection/service_anomaly_timeseries';

const INITIAL_STATE = {
  currentPeriod: [],
  previousPeriod: [],
};

export function ServiceOverviewThroughputChartWithoutAppContext({
  start,
  end,
  kuery,
  environment,
  serviceName,
  preferred,
  transactionName,
  transactionType,
  transactionTypeStatus,
  previousPeriodLabel,
  comparisonEnabled,
  offset,
  height,
  preferredAnomalyTimeseries,
}: {
  start: string;
  end: string;
  kuery: string;
  environment: Environment;
  serviceName: string;
  preferred: PreferredDataSourceAndBucketSize<
    ApmDocumentType.TransactionMetric | ApmDocumentType.ServiceTransactionMetric
  >;
  transactionName: string | undefined;
  transactionType: string | undefined;
  transactionTypeStatus: FETCH_STATUS;
  previousPeriodLabel: string | undefined;
  comparisonEnabled: boolean;
  offset: string | undefined;
  height?: number;
  preferredAnomalyTimeseries: ServiceAnomalyTimeseries | undefined;
}) {
  const comparisonChartTheme = getComparisonChartTheme();

  const { data = INITIAL_STATE, status } = useFetcher(
    (callApmApi) => {
      if (!transactionType && transactionTypeStatus === FETCH_STATUS.SUCCESS) {
        return Promise.resolve(INITIAL_STATE);
      }

      if (serviceName && transactionType && start && end && preferred) {
        return callApmApi('GET /internal/apm/services/{serviceName}/throughput', {
          params: {
            path: {
              serviceName,
            },
            query: {
              environment,
              kuery,
              start,
              end,
              transactionType,
              offset: comparisonEnabled && isTimeComparison(offset) ? offset : undefined,
              transactionName,
              documentType: preferred.source.documentType,
              rollupInterval: preferred.source.rollupInterval,
              bucketSizeInSeconds: preferred.bucketSizeInSeconds,
            },
          },
        });
      }
    },
    [
      environment,
      kuery,
      serviceName,
      start,
      end,
      transactionType,
      transactionTypeStatus,
      offset,
      transactionName,
      comparisonEnabled,
      preferred,
    ]
  );

  const { currentPeriodColor, previousPeriodColor } = getTimeSeriesColor(ChartType.THROUGHPUT);

  const timeseries = [
    {
      data: data?.currentPeriod ?? [],
      type: 'linemark',
      color: currentPeriodColor,
      title: i18n.translate('xpack.apm.serviceOverview.throughtputChartTitle', {
        defaultMessage: 'Throughput',
      }),
    },
    ...(comparisonEnabled
      ? [
          {
            data: data?.previousPeriod ?? [],
            type: 'area',
            color: previousPeriodColor,
            title: previousPeriodLabel ?? '',
          },
        ]
      : []),
  ];

  return (
    <TimeseriesChartWithoutAppContext
      id="throughput"
      height={height}
      showAnnotations={false}
      fetchStatus={status}
      timeseries={timeseries}
      yLabelFormat={asExactTransactionRate}
      customTheme={comparisonChartTheme}
      comparisonEnabled={comparisonEnabled}
      offset={offset}
      anomalyTimeseries={
        preferredAnomalyTimeseries
          ? {
              ...preferredAnomalyTimeseries,
              color: previousPeriodColor,
            }
          : undefined
      }
    />
  );
}

export function ServiceOverviewThroughputChart({
  height,
  kuery,
  transactionName,
}: {
  height?: number;
  kuery: string;
  transactionName?: string;
}) {
  const {
    query: { rangeFrom, rangeTo, comparisonEnabled, offset },
  } = useAnyOfApmParams('/services/{serviceName}', '/mobile-services/{serviceName}');

  const { environment } = useEnvironmentsContext();

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { transactionType, serviceName, transactionTypeStatus } = useApmServiceContext();

  const previousPeriodLabel = usePreviousPeriodLabel();

  const setScreenContext = useApmPluginContext().observabilityAIAssistant?.service.setScreenContext;

  const preferred = usePreferredDataSourceAndBucketSize({
    start,
    end,
    numBuckets: 100,
    kuery,
    type: transactionName
      ? ApmDocumentType.TransactionMetric
      : ApmDocumentType.ServiceTransactionMetric,
  });

  const preferredAnomalyTimeseries = usePreferredServiceAnomalyTimeseries(
    AnomalyDetectorType.txThroughput
  );

  useEffect(() => {
    return setScreenContext?.(
      getThroughputScreenContext({
        serviceName,
        transactionName,
        transactionType,
        environment,
        preferred,
      })
    );
  }, [
    serviceName,
    transactionName,
    transactionType,
    environment,
    setScreenContext,
    preferred,
    start,
    end,
  ]);

  return (
    <EuiPanel hasBorder={true}>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h2>
              {i18n.translate('xpack.apm.serviceOverview.throughtputChartTitle', {
                defaultMessage: 'Throughput',
              })}
            </h2>
          </EuiTitle>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiIconTip
            content={i18n.translate('xpack.apm.serviceOverview.tpmHelp', {
              defaultMessage: 'Throughput is measured in transactions per minute (tpm).',
            })}
            position="right"
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <ServiceOverviewThroughputChartWithoutAppContext
        start={start}
        end={end}
        kuery={kuery}
        environment={environment}
        serviceName={serviceName}
        transactionName={transactionName}
        transactionType={transactionType}
        transactionTypeStatus={transactionTypeStatus}
        comparisonEnabled={comparisonEnabled}
        offset={offset}
        previousPeriodLabel={previousPeriodLabel}
        height={height}
        preferred={preferred}
        preferredAnomalyTimeseries={preferredAnomalyTimeseries}
      />
    </EuiPanel>
  );
}
