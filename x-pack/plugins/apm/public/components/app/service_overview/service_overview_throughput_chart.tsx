/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiPanel,
  EuiTitle,
  EuiIconTip,
  EuiFlexItem,
  EuiFlexGroup,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ApmMlDetectorType } from '../../../../common/anomaly_detection/apm_ml_detectors';
import { asExactTransactionRate } from '../../../../common/utils/formatters';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { useEnvironmentsContext } from '../../../context/environments_context/use_environments_context';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useFetcher } from '../../../hooks/use_fetcher';
import { usePreferredServiceAnomalyTimeseries } from '../../../hooks/use_preferred_service_anomaly_timeseries';
import { useTimeRange } from '../../../hooks/use_time_range';
import { TimeseriesChart } from '../../shared/charts/timeseries_chart';
import {
  getComparisonChartTheme,
  getTimeRangeComparison,
} from '../../shared/time_comparison/get_time_range_comparison';
import {
  ChartType,
  getTimeSeriesColor,
} from '../../shared/charts/helper/get_timeseries_color';

const INITIAL_STATE = {
  currentPeriod: [],
  previousPeriod: [],
};

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
    query: { rangeFrom, rangeTo, comparisonEnabled, comparisonType },
  } = useApmParams('/services/{serviceName}');

  const { environment } = useEnvironmentsContext();

  const preferredAnomalyTimeseries = usePreferredServiceAnomalyTimeseries(
    ApmMlDetectorType.txThroughput
  );

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { transactionType, serviceName } = useApmServiceContext();

  const comparisonChartTheme = getComparisonChartTheme();
  const { comparisonStart, comparisonEnd } = getTimeRangeComparison({
    start,
    end,
    comparisonType,
    comparisonEnabled,
  });

  const { data = INITIAL_STATE, status } = useFetcher(
    (callApmApi) => {
      if (serviceName && transactionType && start && end) {
        return callApmApi(
          'GET /internal/apm/services/{serviceName}/throughput',
          {
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
                comparisonStart,
                comparisonEnd,
                transactionName,
              },
            },
          }
        );
      }
    },
    [
      environment,
      kuery,
      serviceName,
      start,
      end,
      transactionType,
      comparisonStart,
      comparisonEnd,
      transactionName,
    ]
  );

  const { currentPeriodColor, previousPeriodColor } = getTimeSeriesColor(
    ChartType.THROUGHPUT
  );

  const timeseries = [
    {
      data: data.currentPeriod,
      type: 'linemark',
      color: currentPeriodColor,
      title: i18n.translate('xpack.apm.serviceOverview.throughtputChartTitle', {
        defaultMessage: 'Throughput',
      }),
    },
    ...(comparisonEnabled
      ? [
          {
            data: data.previousPeriod,
            type: 'area',
            color: previousPeriodColor,
            title: i18n.translate(
              'xpack.apm.serviceOverview.throughtputChart.previousPeriodLabel',
              { defaultMessage: 'Previous period' }
            ),
          },
        ]
      : []),
  ];

  return (
    <EuiPanel hasBorder={true}>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h2>
              {i18n.translate(
                'xpack.apm.serviceOverview.throughtputChartTitle',
                { defaultMessage: 'Throughput' }
              )}
            </h2>
          </EuiTitle>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiIconTip
            content={i18n.translate('xpack.apm.serviceOverview.tpmHelp', {
              defaultMessage:
                'Throughput is measured in transactions per minute (tpm)',
            })}
            position="right"
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <TimeseriesChart
        id="throughput"
        height={height}
        showAnnotations={false}
        fetchStatus={status}
        timeseries={timeseries}
        yLabelFormat={asExactTransactionRate}
        customTheme={comparisonChartTheme}
        anomalyTimeseries={preferredAnomalyTimeseries}
      />
    </EuiPanel>
  );
}
