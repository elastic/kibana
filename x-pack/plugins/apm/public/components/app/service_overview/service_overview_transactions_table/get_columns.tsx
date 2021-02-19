/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBasicTableColumn } from '@elastic/eui';
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

type TransactionGroupPrimaryStatistics = APIReturnType<'GET /api/apm/services/{serviceName}/transactions/groups/primary_statistics'>;

type ServiceTransactionGroupItem = ValuesType<
  TransactionGroupPrimaryStatistics['transactionGroups']
>;
type TransactionGroupComparisonStatistics = APIReturnType<'GET /api/apm/services/{serviceName}/transactions/groups/comparison_statistics'>;

export function getColumns({
  serviceName,
  latencyAggregationType,
  transactionGroupComparisonStatistics,
}: {
  serviceName: string;
  latencyAggregationType?: LatencyAggregationType;
  transactionGroupComparisonStatistics?: TransactionGroupComparisonStatistics;
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
        const timeseries =
          transactionGroupComparisonStatistics?.[name]?.latency;
        return (
          <SparkPlot
            color="euiColorVis1"
            compact
            series={timeseries}
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
        const timeseries =
          transactionGroupComparisonStatistics?.[name]?.throughput;
        return (
          <SparkPlot
            color="euiColorVis0"
            compact
            series={timeseries}
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
        const timeseries =
          transactionGroupComparisonStatistics?.[name]?.errorRate;
        return (
          <SparkPlot
            color="euiColorVis7"
            compact
            series={timeseries}
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
        const impact =
          transactionGroupComparisonStatistics?.[name]?.impact ?? 0;
        return <ImpactBar value={impact} size="m" />;
      },
    },
  ];
}
