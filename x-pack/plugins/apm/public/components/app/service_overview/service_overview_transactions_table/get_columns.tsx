/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBasicTableColumn, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ValuesType } from 'utility-types';
import {
  asMillisecondDuration,
  asPercent,
  asTransactionRate,
} from '../../../../../common/utils/formatters';
import { APIReturnType } from '../../../../services/rest/createCallApmApi';
import { px, unit } from '../../../../style/variables';
import { ComparisonSparkPlot } from '../../../shared/charts/comparison_spark_plot';
import { ImpactBar } from '../../../shared/ImpactBar';
import { TransactionDetailLink } from '../../../shared/Links/apm/transaction_detail_link';
import { TruncateWithTooltip } from '../../../shared/truncate_with_tooltip';

type TransactionGroupPrimaryStatistics = APIReturnType<'GET /api/apm/services/{serviceName}/transactions/groups/primary_statistics'>;

type ServiceTransactionGroupItem = ValuesType<
  TransactionGroupPrimaryStatistics['transactionGroups']
>;
type TransactionGroupComparisonStatistics = APIReturnType<'GET /api/apm/services/{serviceName}/transactions/groups/comparison_statistics'>;

function getLatencyAggregationTypeLabel(latencyAggregationType?: string) {
  switch (latencyAggregationType) {
    case 'avg':
      return i18n.translate(
        'xpack.apm.serviceOverview.transactionsTableColumnLatency.avg',
        { defaultMessage: 'Latency (avg.)' }
      );

    case 'p95':
      return i18n.translate(
        'xpack.apm.serviceOverview.transactionsTableColumnLatency.p95',
        { defaultMessage: 'Latency (95th)' }
      );

    case 'p99':
      return i18n.translate(
        'xpack.apm.serviceOverview.transactionsTableColumnLatency.p99',
        { defaultMessage: 'Latency (99th)' }
      );
  }
}

export function getColumns({
  serviceName,
  latencyAggregationType,
  transactionGroupComparisonStatistics,
  comparisonEnabled = true,
}: {
  serviceName: string;
  latencyAggregationType?: string;
  transactionGroupComparisonStatistics?: TransactionGroupComparisonStatistics;
  comparisonEnabled?: boolean;
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
      name: getLatencyAggregationTypeLabel(latencyAggregationType),
      width: px(unit * 10),
      render: (_, { latency, name }) => {
        const currentTimeseries =
          transactionGroupComparisonStatistics?.currentPeriod?.[name]?.latency;
        const previousTimeseries =
          transactionGroupComparisonStatistics?.previousPeriod?.[name]?.latency;
        return (
          <ComparisonSparkPlot
            color="euiColorVis1"
            compact
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
      width: px(unit * 10),
      render: (_, { throughput, name }) => {
        const currentTimeseries =
          transactionGroupComparisonStatistics?.currentPeriod?.[name]
            ?.throughput;
        const previousTimeseries =
          transactionGroupComparisonStatistics?.previousPeriod?.[name]
            ?.throughput;
        return (
          <ComparisonSparkPlot
            color="euiColorVis0"
            compact
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
        { defaultMessage: 'Error rate' }
      ),
      width: px(unit * 8),
      render: (_, { errorRate, name }) => {
        const currentTimeseries =
          transactionGroupComparisonStatistics?.currentPeriod?.[name]
            ?.errorRate;
        const previousTimeseries =
          transactionGroupComparisonStatistics?.previousPeriod?.[name]
            ?.errorRate;
        return (
          <ComparisonSparkPlot
            color="euiColorVis7"
            compact
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
      width: px(unit * 5),
      render: (_, { name }) => {
        const currenIimpact =
          transactionGroupComparisonStatistics?.currentPeriod?.[name]?.impact ??
          0;
        const previousIimpact =
          transactionGroupComparisonStatistics?.previousPeriod?.[name]
            ?.impact ?? 0;
        return (
          <EuiFlexGroup gutterSize="xs" direction="column">
            <EuiFlexItem>
              <ImpactBar value={currenIimpact} size="m" />
            </EuiFlexItem>
            <EuiFlexItem>
              <ImpactBar value={previousIimpact} size="s" color="subdued" />
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      },
    },
  ];
}
