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
import { LatencyAggregationType } from '../../../../../common/latency_aggregation_types';
import {
  asMillisecondDuration,
  asPercent,
  asTransactionRate,
} from '../../../../../common/utils/formatters';
import { APIReturnType } from '../../../../services/rest/createCallApmApi';
import { px, unit } from '../../../../style/variables';
import { SparkPlot } from '../../../shared/charts/spark_plot';
import { ImpactBar } from '../../../shared/ImpactBar';
import { TransactionDetailLink } from '../../../shared/Links/apm/transaction_detail_link';
import { TruncateWithTooltip } from '../../../shared/truncate_with_tooltip';
import { getLatencyColumnLabel } from '../get_latency_column_label';

type TransactionGroupMainStatistics = APIReturnType<'GET /api/apm/services/{serviceName}/transactions/groups/main_statistics'>;

type ServiceTransactionGroupItem = ValuesType<
  TransactionGroupMainStatistics['transactionGroups']
>;
type TransactionGroupDetailedStatistics = APIReturnType<'GET /api/apm/services/{serviceName}/transactions/groups/detailed_statistics'>;

export function getColumns({
  serviceName,
  latencyAggregationType,
  transactionGroupDetailedStatistics,
  comparisonEnabled,
}: {
  serviceName: string;
  latencyAggregationType?: LatencyAggregationType;
  transactionGroupDetailedStatistics?: TransactionGroupDetailedStatistics;
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
      name: getLatencyColumnLabel(latencyAggregationType),
      width: px(unit * 10),
      render: (_, { latency, name }) => {
        const currentTimeseries =
          transactionGroupDetailedStatistics?.currentPeriod?.[name]?.latency;
        const previousTimeseries =
          transactionGroupDetailedStatistics?.previousPeriod?.[name]?.latency;
        return (
          <SparkPlot
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
          transactionGroupDetailedStatistics?.currentPeriod?.[name]?.throughput;
        const previousTimeseries =
          transactionGroupDetailedStatistics?.previousPeriod?.[name]
            ?.throughput;
        return (
          <SparkPlot
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
          transactionGroupDetailedStatistics?.currentPeriod?.[name]?.errorRate;
        const previousTimeseries =
          transactionGroupDetailedStatistics?.previousPeriod?.[name]?.errorRate;
        return (
          <SparkPlot
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
        const currentImpact =
          transactionGroupDetailedStatistics?.currentPeriod?.[name]?.impact ??
          0;
        const previousImpact =
          transactionGroupDetailedStatistics?.previousPeriod?.[name]?.impact;
        return (
          <EuiFlexGroup gutterSize="xs" direction="column">
            <EuiFlexItem>
              <ImpactBar value={currentImpact} size="m" />
            </EuiFlexItem>
            {comparisonEnabled && previousImpact && (
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
