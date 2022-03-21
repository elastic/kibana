/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, RIGHT_ALIGNMENT } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ValuesType } from 'utility-types';
import { LatencyAggregationType } from '../../../../common/latency_aggregation_types';
import { TimeRangeComparisonType } from '../../../../common/runtime_types/comparison_type_rt';
import {
  asMillisecondDuration,
  asPercent,
  asTransactionRate,
} from '../../../../common/utils/formatters';
import { APIReturnType } from '../../../services/rest/create_call_apm_api';
import { ImpactBar } from '../impact_bar';
import { TransactionDetailLink } from '../links/apm/transaction_detail_link';
import { ListMetric } from '../list_metric';
import { ITableColumn } from '../managed_table';
import { TruncateWithTooltip } from '../truncate_with_tooltip';
import { getLatencyColumnLabel } from './get_latency_column_label';
import {
  ChartType,
  getTimeSeriesColor,
} from '../charts/helper/get_timeseries_color';

type TransactionGroupMainStatistics =
  APIReturnType<'GET /internal/apm/services/{serviceName}/transactions/groups/main_statistics'>;

type ServiceTransactionGroupItem = ValuesType<
  TransactionGroupMainStatistics['transactionGroups']
>;
type TransactionGroupDetailedStatistics =
  APIReturnType<'GET /internal/apm/services/{serviceName}/transactions/groups/detailed_statistics'>;

export function getColumns({
  serviceName,
  latencyAggregationType,
  transactionGroupDetailedStatisticsLoading,
  transactionGroupDetailedStatistics,
  comparisonEnabled,
  shouldShowSparkPlots = true,
  comparisonType,
}: {
  serviceName: string;
  latencyAggregationType?: LatencyAggregationType;
  transactionGroupDetailedStatisticsLoading: boolean;
  transactionGroupDetailedStatistics?: TransactionGroupDetailedStatistics;
  comparisonEnabled?: boolean;
  shouldShowSparkPlots?: boolean;
  comparisonType?: TimeRangeComparisonType;
}): Array<ITableColumn<ServiceTransactionGroupItem>> {
  return [
    {
      field: 'name',
      sortable: true,
      name: i18n.translate(
        'xpack.apm.serviceOverview.transactionsTableColumnName',
        { defaultMessage: 'Name' }
      ),
      render: (_, { name, transactionType: type }) => {
        return (
          <TruncateWithTooltip
            text={name}
            content={
              <TransactionDetailLink
                serviceName={serviceName}
                transactionName={name}
                transactionType={type}
                latencyAggregationType={latencyAggregationType}
                comparisonEnabled={comparisonEnabled}
                comparisonType={comparisonType}
              >
                {name}
              </TransactionDetailLink>
            }
          />
        );
      },
    },
    {
      field: 'latency',
      sortable: true,
      name: getLatencyColumnLabel(latencyAggregationType),
      align: RIGHT_ALIGNMENT,
      render: (_, { latency, name }) => {
        const currentTimeseries =
          transactionGroupDetailedStatistics?.currentPeriod?.[name]?.latency;
        const previousTimeseries =
          transactionGroupDetailedStatistics?.previousPeriod?.[name]?.latency;

        const { currentPeriodColor, previousPeriodColor } = getTimeSeriesColor(
          ChartType.LATENCY_AVG
        );

        return (
          <ListMetric
            color={currentPeriodColor}
            compact
            hideSeries={!shouldShowSparkPlots}
            seriesLoading={transactionGroupDetailedStatisticsLoading}
            series={currentTimeseries}
            comparisonSeries={
              comparisonEnabled ? previousTimeseries : undefined
            }
            valueLabel={asMillisecondDuration(latency)}
            comparisonSeriesColor={previousPeriodColor}
          />
        );
      },
    },
    {
      field: 'throughput',
      sortable: true,
      name: i18n.translate(
        'xpack.apm.serviceOverview.transactionsTableColumnThroughput',
        { defaultMessage: 'Throughput' }
      ),
      align: RIGHT_ALIGNMENT,
      render: (_, { throughput, name }) => {
        const currentTimeseries =
          transactionGroupDetailedStatistics?.currentPeriod?.[name]?.throughput;
        const previousTimeseries =
          transactionGroupDetailedStatistics?.previousPeriod?.[name]
            ?.throughput;

        const { currentPeriodColor, previousPeriodColor } = getTimeSeriesColor(
          ChartType.THROUGHPUT
        );

        return (
          <ListMetric
            color={currentPeriodColor}
            compact
            hideSeries={!shouldShowSparkPlots}
            seriesLoading={transactionGroupDetailedStatisticsLoading}
            series={currentTimeseries}
            comparisonSeries={
              comparisonEnabled ? previousTimeseries : undefined
            }
            valueLabel={asTransactionRate(throughput)}
            comparisonSeriesColor={previousPeriodColor}
          />
        );
      },
    },
    {
      field: 'errorRate',
      sortable: true,
      name: i18n.translate(
        'xpack.apm.serviceOverview.transactionsTableColumnErrorRate',
        { defaultMessage: 'Failed transaction rate' }
      ),
      align: RIGHT_ALIGNMENT,
      render: (_, { errorRate, name }) => {
        const currentTimeseries =
          transactionGroupDetailedStatistics?.currentPeriod?.[name]?.errorRate;
        const previousTimeseries =
          transactionGroupDetailedStatistics?.previousPeriod?.[name]?.errorRate;

        const { currentPeriodColor, previousPeriodColor } = getTimeSeriesColor(
          ChartType.FAILED_TRANSACTION_RATE
        );

        return (
          <ListMetric
            color={currentPeriodColor}
            compact
            hideSeries={!shouldShowSparkPlots}
            seriesLoading={transactionGroupDetailedStatisticsLoading}
            series={currentTimeseries}
            comparisonSeries={
              comparisonEnabled ? previousTimeseries : undefined
            }
            valueLabel={asPercent(errorRate, 1)}
            comparisonSeriesColor={previousPeriodColor}
          />
        );
      },
    },
    {
      field: 'impact',
      sortable: true,
      name: i18n.translate(
        'xpack.apm.serviceOverview.transactionsTableColumnImpact',
        { defaultMessage: 'Impact' }
      ),
      align: RIGHT_ALIGNMENT,
      render: (_, { name }) => {
        const currentImpact =
          transactionGroupDetailedStatistics?.currentPeriod?.[name]?.impact ??
          0;
        const previousImpact =
          transactionGroupDetailedStatistics?.previousPeriod?.[name]?.impact;
        return (
          <EuiFlexGroup alignItems="flexEnd" gutterSize="xs" direction="column">
            <EuiFlexItem>
              <ImpactBar value={currentImpact} size="m" />
            </EuiFlexItem>
            {comparisonEnabled && previousImpact !== undefined && (
              <EuiFlexItem>
                <ImpactBar value={previousImpact} size="s" color="subdued" />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        );
      },
    },
  ];
}
