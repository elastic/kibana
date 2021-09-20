/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTableColumn,
  EuiFlexGroup,
  EuiFlexItem,
  RIGHT_ALIGNMENT,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ValuesType } from 'utility-types';
import { LatencyAggregationType } from '../../../../common/latency_aggregation_types';
import {
  asMillisecondDuration,
  asPercent,
  asTransactionRate,
} from '../../../../common/utils/formatters';
import { APIReturnType } from '../../../services/rest/createCallApmApi';
import { ImpactBar } from '../ImpactBar';
import { TransactionDetailLink } from '../Links/apm/transaction_detail_link';
import { ListMetric } from '../list_metric';
import { TruncateWithTooltip } from '../truncate_with_tooltip';
import { getLatencyColumnLabel } from './get_latency_column_label';

type TransactionGroupMainStatistics =
  APIReturnType<'GET /api/apm/services/{serviceName}/transactions/groups/main_statistics'>;

type ServiceTransactionGroupItem = ValuesType<
  TransactionGroupMainStatistics['transactionGroups']
>;
type TransactionGroupDetailedStatistics =
  APIReturnType<'GET /api/apm/services/{serviceName}/transactions/groups/detailed_statistics'>;

export function getColumns({
  serviceName,
  latencyAggregationType,
  transactionGroupDetailedStatistics,
  comparisonEnabled,
  shouldShowSparkPlots = true,
}: {
  serviceName: string;
  latencyAggregationType?: LatencyAggregationType;
  transactionGroupDetailedStatistics?: TransactionGroupDetailedStatistics;
  comparisonEnabled?: boolean;
  shouldShowSparkPlots?: boolean;
}): Array<EuiBasicTableColumn<ServiceTransactionGroupItem>> {
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
        return (
          <ListMetric
            color="euiColorVis1"
            compact
            hideSeries={!shouldShowSparkPlots}
            series={currentTimeseries}
            comparisonSeries={
              comparisonEnabled ? previousTimeseries : undefined
            }
            valueLabel={asMillisecondDuration(latency)}
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
        return (
          <ListMetric
            color="euiColorVis0"
            compact
            hideSeries={!shouldShowSparkPlots}
            series={currentTimeseries}
            comparisonSeries={
              comparisonEnabled ? previousTimeseries : undefined
            }
            valueLabel={asTransactionRate(throughput)}
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
        return (
          <ListMetric
            color="euiColorVis7"
            compact
            hideSeries={!shouldShowSparkPlots}
            series={currentTimeseries}
            comparisonSeries={
              comparisonEnabled ? previousTimeseries : undefined
            }
            valueLabel={asPercent(errorRate, 1)}
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
