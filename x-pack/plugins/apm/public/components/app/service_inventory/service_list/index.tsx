/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  EuiToolTip,
  RIGHT_ALIGNMENT,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TypeOf } from '@kbn/typed-react-router-config';
import React, { useMemo } from 'react';
import { NOT_AVAILABLE_LABEL } from '../../../../../common/i18n';
import { ServiceHealthStatus } from '../../../../../common/service_health_status';
import {
  TRANSACTION_PAGE_LOAD,
  TRANSACTION_REQUEST,
} from '../../../../../common/transaction_types';
import {
  asMillisecondDuration,
  asPercent,
  asTransactionRate,
} from '../../../../../common/utils/formatters';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { Breakpoints, useBreakpoints } from '../../../../hooks/use_breakpoints';
import { useFallbackToTransactionsFetcher } from '../../../../hooks/use_fallback_to_transactions_fetcher';
import { APIReturnType } from '../../../../services/rest/create_call_apm_api';
import { unit } from '../../../../utils/style';
import { ApmRoutes } from '../../../routing/apm_route_config';
import { AggregatedTransactionsBadge } from '../../../shared/aggregated_transactions_badge';
import { EnvironmentBadge } from '../../../shared/environment_badge';
import { ListMetric } from '../../../shared/list_metric';
import { ITableColumn, ManagedTable } from '../../../shared/managed_table';
import { ServiceLink } from '../../../shared/service_link';
import { TruncateWithTooltip } from '../../../shared/truncate_with_tooltip';
import {
  ChartType,
  getTimeSeriesColor,
} from '../../../shared/charts/helper/get_timeseries_color';
import { HealthBadge } from './health_badge';
import {
  ServiceInventoryFieldName,
  ServiceListItem,
} from '../../../../../common/service_inventory';

type ServicesDetailedStatisticsAPIResponse =
  APIReturnType<'GET /internal/apm/services/detailed_statistics'>;

function formatString(value?: string | null) {
  return value || NOT_AVAILABLE_LABEL;
}

export function getServiceColumns({
  query,
  showTransactionTypeColumn,
  comparisonDataLoading,
  comparisonData,
  breakpoints,
  showHealthStatusColumn,
}: {
  query: TypeOf<ApmRoutes, '/services'>['query'];
  showTransactionTypeColumn: boolean;
  showHealthStatusColumn: boolean;
  comparisonDataLoading: boolean;
  breakpoints: Breakpoints;
  comparisonData?: ServicesDetailedStatisticsAPIResponse;
}): Array<ITableColumn<ServiceListItem>> {
  const { isSmall, isLarge, isXl } = breakpoints;
  const showWhenSmallOrGreaterThanLarge = isSmall || !isLarge;
  const showWhenSmallOrGreaterThanXL = isSmall || !isXl;

  return [
    ...(showHealthStatusColumn
      ? [
          {
            field: ServiceInventoryFieldName.HealthStatus,
            name: i18n.translate('xpack.apm.servicesTable.healthColumnLabel', {
              defaultMessage: 'Health',
            }),
            width: `${unit * 6}px`,
            sortable: true,
            render: (_, { healthStatus }) => {
              return (
                <HealthBadge
                  healthStatus={healthStatus ?? ServiceHealthStatus.unknown}
                />
              );
            },
          } as ITableColumn<ServiceListItem>,
        ]
      : []),
    {
      field: ServiceInventoryFieldName.ServiceName,
      name: i18n.translate('xpack.apm.servicesTable.nameColumnLabel', {
        defaultMessage: 'Name',
      }),
      sortable: true,
      render: (_, { serviceName, agentName, transactionType }) => (
        <TruncateWithTooltip
          data-test-subj="apmServiceListAppLink"
          text={formatString(serviceName)}
          content={
            <ServiceLink
              agentName={agentName}
              query={{ ...query, transactionType }}
              serviceName={serviceName}
            />
          }
        />
      ),
    },
    ...(showWhenSmallOrGreaterThanLarge
      ? [
          {
            field: ServiceInventoryFieldName.Environments,
            name: i18n.translate(
              'xpack.apm.servicesTable.environmentColumnLabel',
              {
                defaultMessage: 'Environment',
              }
            ),
            width: `${unit * 10}px`,
            sortable: true,
            render: (_, { environments }) => (
              <EnvironmentBadge environments={environments ?? []} />
            ),
          } as ITableColumn<ServiceListItem>,
        ]
      : []),
    ...(showTransactionTypeColumn && showWhenSmallOrGreaterThanXL
      ? [
          {
            field: ServiceInventoryFieldName.TransactionType,
            name: i18n.translate(
              'xpack.apm.servicesTable.transactionColumnLabel',
              { defaultMessage: 'Transaction type' }
            ),
            width: `${unit * 10}px`,
            sortable: true,
          },
        ]
      : []),
    {
      field: ServiceInventoryFieldName.Latency,
      name: i18n.translate('xpack.apm.servicesTable.latencyAvgColumnLabel', {
        defaultMessage: 'Latency (avg.)',
      }),
      sortable: true,
      dataType: 'number',
      render: (_, { serviceName, latency }) => {
        const { currentPeriodColor, previousPeriodColor } = getTimeSeriesColor(
          ChartType.LATENCY_AVG
        );
        return (
          <ListMetric
            isLoading={comparisonDataLoading}
            series={comparisonData?.currentPeriod[serviceName]?.latency}
            comparisonSeries={
              comparisonData?.previousPeriod[serviceName]?.latency
            }
            hideSeries={!showWhenSmallOrGreaterThanLarge}
            color={currentPeriodColor}
            valueLabel={asMillisecondDuration(latency || 0)}
            comparisonSeriesColor={previousPeriodColor}
          />
        );
      },
      align: RIGHT_ALIGNMENT,
    },
    {
      field: ServiceInventoryFieldName.Throughput,
      name: i18n.translate('xpack.apm.servicesTable.throughputColumnLabel', {
        defaultMessage: 'Throughput',
      }),
      sortable: true,
      dataType: 'number',
      render: (_, { serviceName, throughput }) => {
        const { currentPeriodColor, previousPeriodColor } = getTimeSeriesColor(
          ChartType.THROUGHPUT
        );

        return (
          <ListMetric
            isLoading={comparisonDataLoading}
            series={comparisonData?.currentPeriod[serviceName]?.throughput}
            comparisonSeries={
              comparisonData?.previousPeriod[serviceName]?.throughput
            }
            hideSeries={!showWhenSmallOrGreaterThanLarge}
            color={currentPeriodColor}
            valueLabel={asTransactionRate(throughput)}
            comparisonSeriesColor={previousPeriodColor}
          />
        );
      },
      align: RIGHT_ALIGNMENT,
    },
    {
      field: ServiceInventoryFieldName.TransactionErrorRate,
      name: i18n.translate('xpack.apm.servicesTable.transactionErrorRate', {
        defaultMessage: 'Failed transaction rate',
      }),
      sortable: true,
      dataType: 'number',
      render: (_, { serviceName, transactionErrorRate }) => {
        const valueLabel = asPercent(transactionErrorRate, 1);
        const { currentPeriodColor, previousPeriodColor } = getTimeSeriesColor(
          ChartType.FAILED_TRANSACTION_RATE
        );
        return (
          <ListMetric
            isLoading={comparisonDataLoading}
            series={
              comparisonData?.currentPeriod[serviceName]?.transactionErrorRate
            }
            comparisonSeries={
              comparisonData?.previousPeriod[serviceName]?.transactionErrorRate
            }
            hideSeries={!showWhenSmallOrGreaterThanLarge}
            color={currentPeriodColor}
            valueLabel={valueLabel}
            comparisonSeriesColor={previousPeriodColor}
          />
        );
      },
      align: RIGHT_ALIGNMENT,
    },
  ];
}

interface Props {
  items: ServiceListItem[];
  comparisonDataLoading: boolean;
  comparisonData?: ServicesDetailedStatisticsAPIResponse;
  noItemsMessage?: React.ReactNode;
  isLoading: boolean;
  isFailure?: boolean;
  displayHealthStatus: boolean;
  initialSortField: ServiceInventoryFieldName;
  initialSortDirection: 'asc' | 'desc';
  sortFn: (
    sortItems: ServiceListItem[],
    sortField: ServiceInventoryFieldName,
    sortDirection: 'asc' | 'desc'
  ) => ServiceListItem[];
}

export function ServiceList({
  items,
  noItemsMessage,
  comparisonDataLoading,
  comparisonData,
  isLoading,
  isFailure,
  displayHealthStatus,
  initialSortField,
  initialSortDirection,
  sortFn,
}: Props) {
  const breakpoints = useBreakpoints();

  const showTransactionTypeColumn = items.some(
    ({ transactionType }) =>
      transactionType !== TRANSACTION_REQUEST &&
      transactionType !== TRANSACTION_PAGE_LOAD
  );

  const { query } = useApmParams('/services');

  const { kuery } = query;
  const { fallbackToTransactions } = useFallbackToTransactionsFetcher({
    kuery,
  });

  const serviceColumns = useMemo(
    () =>
      getServiceColumns({
        query,
        showTransactionTypeColumn,
        comparisonDataLoading,
        comparisonData,
        breakpoints,
        showHealthStatusColumn: displayHealthStatus,
      }),
    [
      query,
      showTransactionTypeColumn,
      comparisonDataLoading,
      comparisonData,
      breakpoints,
      displayHealthStatus,
    ]
  );

  return (
    <EuiFlexGroup gutterSize="xs" direction="column" responsive={false}>
      <EuiFlexItem>
        <EuiFlexGroup
          alignItems="center"
          gutterSize="xs"
          justifyContent="flexEnd"
        >
          {fallbackToTransactions && (
            <EuiFlexItem>
              <AggregatedTransactionsBadge />
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <EuiToolTip
              position="top"
              content={i18n.translate(
                'xpack.apm.servicesTable.tooltip.metricsExplanation',
                {
                  defaultMessage:
                    'Service metrics are aggregated on transaction type "request", "page-load", or the top available transaction type.',
                }
              )}
            >
              <EuiIcon type="questionInCircle" color="subdued" />
            </EuiToolTip>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {i18n.translate(
                'xpack.apm.servicesTable.metricsExplanationLabel',
                { defaultMessage: 'What are these metrics?' }
              )}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <ManagedTable<ServiceListItem>
          isLoading={isLoading}
          error={isFailure}
          columns={serviceColumns}
          items={items}
          noItemsMessage={noItemsMessage}
          initialSortField={initialSortField}
          initialSortDirection={initialSortDirection}
          sortFn={(itemsToSort, sortField, sortDirection) =>
            sortFn(
              itemsToSort,
              sortField as ServiceInventoryFieldName,
              sortDirection
            )
          }
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
