/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiBasicTableColumn,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiToolTip,
  RIGHT_ALIGNMENT,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { TypeOf } from '@kbn/typed-react-router-config';
import { ValuesType } from 'utility-types';
import { ALERT_STATUS_ACTIVE } from '@kbn/rule-registry-plugin/common/technical_rule_data_field_names';
import {
  asMillisecondDuration,
  asPercent,
  asTransactionRate,
} from '../../../../common/utils/formatters';
import { APIReturnType } from '../../../services/rest/create_call_apm_api';
import {
  ChartType,
  getTimeSeriesColor,
} from '../charts/helper/get_timeseries_color';
import { ImpactBar } from '../impact_bar';
import { TransactionDetailLink } from '../links/apm/transaction_detail_link';
import { ListMetric } from '../list_metric';
import { isTimeComparison } from '../time_comparison/get_comparison_options';
import { getLatencyColumnLabel } from './get_latency_column_label';
import { ApmRoutes } from '../../routing/apm_route_config';
import { unit } from '../../../utils/style';
import { LatencyAggregationType } from '../../../../common/latency_aggregation_types';
import {
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '../../../../common/es_fields/apm';
import { fieldValuePairToKql } from '../../../../common/utils/field_value_pair_to_kql';

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
  transactionGroupDetailedStatisticsLoading,
  transactionGroupDetailedStatistics,
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
  transactionGroupDetailedStatisticsLoading: boolean;
  transactionGroupDetailedStatistics?: TransactionGroupDetailedStatistics;
  comparisonEnabled?: boolean;
  shouldShowSparkPlots?: boolean;
  showAlertsColumn: boolean;
  offset?: string;
  transactionOverflowCount: number;
  link: any;
  query: TypeOf<ApmRoutes, '/services/{serviceName}/overview'>['query'];
}): Array<EuiBasicTableColumn<ServiceTransactionGroupItem>> {
  return [
    ...(showAlertsColumn
      ? [
          {
            field: 'alertsCount',
            sortable: true,
            name: i18n.translate(
              'xpack.apm.transactionsTableColumnName.alertsColumnLabel',
              { defaultMessage: 'Active alerts' }
            ),
            width: `${unit * 6}px`,
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
                          ...fieldValuePairToKql(
                            TRANSACTION_TYPE,
                            transactionType
                          ),
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
          } as EuiBasicTableColumn<ServiceTransactionGroupItem>,
        ]
      : []),
    {
      field: 'name',
      sortable: true,
      name: i18n.translate(
        'xpack.apm.serviceOverview.transactionsTableColumnName',
        { defaultMessage: 'Name' }
      ),
      width: '30%',
      render: (_, { name, transactionType: type }) => {
        return (
          <TransactionDetailLink
            serviceName={serviceName}
            transactionName={name}
            transactionType={type}
            latencyAggregationType={latencyAggregationType}
            comparisonEnabled={comparisonEnabled}
            offset={offset}
            overflowCount={transactionOverflowCount}
          >
            {name}
          </TransactionDetailLink>
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
            isLoading={transactionGroupDetailedStatisticsLoading}
            series={currentTimeseries}
            comparisonSeries={
              comparisonEnabled && isTimeComparison(offset)
                ? previousTimeseries
                : undefined
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
            isLoading={transactionGroupDetailedStatisticsLoading}
            series={currentTimeseries}
            comparisonSeries={
              comparisonEnabled && isTimeComparison(offset)
                ? previousTimeseries
                : undefined
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
      name: (
        <EuiToolTip
          content={i18n.translate(
            'xpack.apm.serviceOverview.transactionsTableColumnErrorRateTip',
            {
              defaultMessage:
                "The percentage of failed transactions for the selected service. HTTP server transactions with a 4xx status code (client error) aren't considered failures because the caller, not the server, caused the failure.",
            }
          )}
        >
          <>
            {i18n.translate(
              'xpack.apm.serviceOverview.transactionsTableColumnErrorRate',
              {
                defaultMessage: 'Failed transaction rate',
              }
            )}
            &nbsp;
            <EuiIcon
              size="s"
              color="subdued"
              type="questionInCircle"
              className="eui-alignCenter"
            />
          </>
        </EuiToolTip>
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
            isLoading={transactionGroupDetailedStatisticsLoading}
            series={currentTimeseries}
            comparisonSeries={
              comparisonEnabled && isTimeComparison(offset)
                ? previousTimeseries
                : undefined
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
      name: (
        <EuiToolTip
          content={i18n.translate(
            'xpack.apm.serviceOverview.transactionsTableColumnImpactTip',
            {
              defaultMessage:
                'The most used and slowest endpoints in your service. Calculated by multiplying latency by throughput.',
            }
          )}
        >
          <>
            {i18n.translate(
              'xpack.apm.serviceOverview.transactionsTableColumnImpact',
              {
                defaultMessage: 'Impact',
              }
            )}
            &nbsp;
            <EuiIcon
              size="s"
              color="subdued"
              type="questionInCircle"
              className="eui-alignCenter"
            />
          </>
        </EuiToolTip>
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
