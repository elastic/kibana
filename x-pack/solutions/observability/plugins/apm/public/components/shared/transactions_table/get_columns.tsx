/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { TypeOf } from '@kbn/typed-react-router-config';
import type { ValuesType } from 'utility-types';
import { ALERT_STATUS_ACTIVE } from '@kbn/rule-registry-plugin/common/technical_rule_data_field_names';
import { listMetricColumnPreset, impactColumnPreset } from '../../../utils/column_presets';
import {
  asMillisecondDuration,
  asPercent,
  asTransactionRate,
} from '../../../../common/utils/formatters';
import type { APIReturnType } from '../../../services/rest/create_call_apm_api';
import { ChartType, getTimeSeriesColor } from '../charts/helper/get_timeseries_color';
import { ImpactBar } from '../impact_bar';
import { TransactionDetailLink } from '../links/apm/transaction_detail_link';
import { ListMetric } from '../list_metric';
import { isTimeComparison } from '../time_comparison/get_comparison_options';
import { getLatencyColumnLabel } from './get_latency_column_label';
import type { ApmRoutes } from '../../routing/apm_route_config';
import type { LatencyAggregationType } from '../../../../common/latency_aggregation_types';
import { TRANSACTION_NAME, TRANSACTION_TYPE } from '../../../../common/es_fields/apm';
import { fieldValuePairToKql } from '../../../../common/utils/field_value_pair_to_kql';
import type { ITableColumn } from '../managed_table';

type TransactionGroupMainStatistics =
  APIReturnType<'GET /internal/apm/services/{serviceName}/transactions/groups/main_statistics'>;

export type ServiceTransactionGroupItem = ValuesType<
  TransactionGroupMainStatistics['transactionGroups']
>;
type TransactionGroupDetailedStatistics =
  APIReturnType<'GET /internal/apm/services/{serviceName}/transactions/groups/detailed_statistics'>;

export function getColumns({
  serviceName,
  latencyAggregationType,
  detailedStatisticsLoading,
  detailedStatistics,
  comparisonEnabled,
  shouldShowSparkPlots = true,
  showAlertsColumn,
  offset,
  transactionOverflowCount,
  link,
  query,
}: {
  serviceName: string;
  latencyAggregationType?: LatencyAggregationType;
  detailedStatisticsLoading: boolean;
  detailedStatistics?: TransactionGroupDetailedStatistics;
  comparisonEnabled: boolean;
  shouldShowSparkPlots?: boolean;
  showAlertsColumn: boolean;
  offset?: string;
  transactionOverflowCount: number;
  link: any;
  query: TypeOf<ApmRoutes, '/services/{serviceName}/overview'>['query'];
}): Array<ITableColumn<ServiceTransactionGroupItem>> {
  return [
    ...(showAlertsColumn
      ? [
          {
            field: 'alertsCount',
            sortable: true,
            name: i18n.translate('xpack.apm.transactionsTableColumnName.alertsColumnLabel', {
              defaultMessage: 'Active alerts',
            }),
            className: 'eui-textNoWrap',
            width: '7em',
            render: (_, { alertsCount, name, transactionType }) => {
              if (!alertsCount) {
                return null;
              }
              return (
                <EuiToolTip
                  position="bottom"
                  content={i18n.translate(
                    'xpack.apm.home.transactionsTableColumnName.tooltip.activeAlertsExplanation',
                    {
                      defaultMessage: 'Active alerts',
                    }
                  )}
                >
                  <EuiBadge
                    iconType="warning"
                    color="danger"
                    href={link('/services/{serviceName}/alerts', {
                      path: { serviceName },
                      query: {
                        ...query,
                        kuery: [
                          query.kuery,
                          ...fieldValuePairToKql(TRANSACTION_NAME, name),
                          ...fieldValuePairToKql(TRANSACTION_TYPE, transactionType),
                        ]
                          .filter(Boolean)
                          .join(' and '),
                        alertStatus: ALERT_STATUS_ACTIVE,
                      },
                    })}
                  >
                    {alertsCount}
                  </EuiBadge>
                </EuiToolTip>
              );
            },
          } as ITableColumn<ServiceTransactionGroupItem>,
        ]
      : []),
    {
      field: 'name',
      sortable: true,
      name: i18n.translate('xpack.apm.serviceOverview.transactionsTableColumnName', {
        defaultMessage: 'Name',
      }),
      minWidth: '12em',
      maxWidth: '20em', // This is just a recommendation and the column will grow if the container allows it
      render: (_, { name, transactionType: type }) => {
        return (
          <TransactionDetailLink
            transactionName={name}
            href={link('/services/{serviceName}/transactions/view', {
              path: { serviceName },
              query: {
                ...query,
                transactionName: name,
                transactionType: type,
                comparisonEnabled,
                offset,
              },
            })}
          >
            {name}
          </TransactionDetailLink>
        );
      },
    },
    {
      ...listMetricColumnPreset(),
      field: 'latency',
      sortable: true,
      name: getLatencyColumnLabel(latencyAggregationType),
      render: (_, { latency, name }) => {
        const currentTimeseries = detailedStatistics?.currentPeriod?.[name]?.latency;
        const previousTimeseries = detailedStatistics?.previousPeriod?.[name]?.latency;
        const { currentPeriodColor, previousPeriodColor } = getTimeSeriesColor(
          ChartType.LATENCY_AVG
        );
        return (
          <ListMetric
            color={currentPeriodColor}
            compact
            hideSeries={!shouldShowSparkPlots}
            isLoading={detailedStatisticsLoading}
            series={currentTimeseries}
            comparisonSeries={
              comparisonEnabled && isTimeComparison(offset) ? previousTimeseries : undefined
            }
            valueLabel={asMillisecondDuration(latency)}
            comparisonSeriesColor={previousPeriodColor}
          />
        );
      },
    },
    {
      ...listMetricColumnPreset(),
      field: 'throughput',
      sortable: true,
      name: i18n.translate('xpack.apm.serviceOverview.transactionsTableColumnThroughput', {
        defaultMessage: 'Throughput',
      }),
      render: (_, { throughput, name }) => {
        const currentTimeseries = detailedStatistics?.currentPeriod?.[name]?.throughput;
        const previousTimeseries = detailedStatistics?.previousPeriod?.[name]?.throughput;
        const { currentPeriodColor, previousPeriodColor } = getTimeSeriesColor(
          ChartType.THROUGHPUT
        );
        return (
          <ListMetric
            color={currentPeriodColor}
            compact
            hideSeries={!shouldShowSparkPlots}
            isLoading={detailedStatisticsLoading}
            series={currentTimeseries}
            comparisonSeries={
              comparisonEnabled && isTimeComparison(offset) ? previousTimeseries : undefined
            }
            valueLabel={asTransactionRate(throughput)}
            comparisonSeriesColor={previousPeriodColor}
          />
        );
      },
    },
    {
      ...listMetricColumnPreset(),
      field: 'errorRate',
      sortable: true,
      className: 'eui-textNoWrap',
      name: i18n.translate('xpack.apm.serviceOverview.transactionsTableColumnErrorRate', {
        defaultMessage: 'Failed transaction rate',
      }),
      nameTooltip: {
        content: i18n.translate('xpack.apm.serviceOverview.transactionsTableColumnErrorRateTip', {
          defaultMessage:
            "The percentage of failed transactions for the selected service. HTTP server transactions with a 4xx status code (client error) aren't considered failures because the caller, not the server, caused the failure.",
        }),
        icon: 'question',
        iconProps: {
          color: 'subdued',
        },
      },
      render: (_, { errorRate, name }) => {
        const currentTimeseries = detailedStatistics?.currentPeriod?.[name]?.errorRate;
        const previousTimeseries = detailedStatistics?.previousPeriod?.[name]?.errorRate;
        const { currentPeriodColor, previousPeriodColor } = getTimeSeriesColor(
          ChartType.FAILED_TRANSACTION_RATE
        );
        return (
          <ListMetric
            color={currentPeriodColor}
            compact
            hideSeries={!shouldShowSparkPlots}
            isLoading={detailedStatisticsLoading}
            series={currentTimeseries}
            comparisonSeries={
              comparisonEnabled && isTimeComparison(offset) ? previousTimeseries : undefined
            }
            valueLabel={asPercent(errorRate, 1)}
            comparisonSeriesColor={previousPeriodColor}
          />
        );
      },
    },
    {
      ...impactColumnPreset(),
      field: 'impact',
      sortable: true,
      name: i18n.translate('xpack.apm.serviceOverview.transactionsTableColumnImpact', {
        defaultMessage: 'Impact',
      }),
      nameTooltip: {
        content: i18n.translate('xpack.apm.serviceOverview.transactionsTableColumnImpactTip', {
          defaultMessage:
            'The most used and slowest endpoints in your service. Calculated by multiplying latency by throughput.',
        }),
        icon: 'question',
        iconProps: {
          color: 'subdued',
        },
      },
      render: (_, { name }) => {
        const currentImpact = detailedStatistics?.currentPeriod?.[name]?.impact ?? 0;
        const previousImpact = detailedStatistics?.previousPeriod?.[name]?.impact;
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
