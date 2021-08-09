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
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { orderBy } from 'lodash';
import React, { useMemo } from 'react';
import { ValuesType } from 'utility-types';
import { euiStyled } from '../../../../../../../../src/plugins/kibana_react/common';
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
import { APIReturnType } from '../../../../services/rest/createCallApmApi';
import { unit } from '../../../../utils/style';
import { EnvironmentBadge } from '../../../shared/EnvironmentBadge';
import { ITableColumn, ManagedTable } from '../../../shared/managed_table';
import { ServiceLink } from '../../../shared/service_link';
import { HealthBadge } from './HealthBadge';
import { ServiceListMetric } from './ServiceListMetric';

type ServiceListAPIResponse = APIReturnType<'GET /api/apm/services'>;
type Items = ServiceListAPIResponse['items'];
type ServicesDetailedStatisticsAPIResponse = APIReturnType<'GET /api/apm/services/detailed_statistics'>;

type ServiceListItem = ValuesType<Items>;

function formatString(value?: string | null) {
  return value || NOT_AVAILABLE_LABEL;
}

const ToolTipWrapper = euiStyled.span`
  width: 100%;
  .apmServiceList__serviceNameTooltip {
    width: 100%;
  }
`;

const SERVICE_HEALTH_STATUS_ORDER = [
  ServiceHealthStatus.unknown,
  ServiceHealthStatus.healthy,
  ServiceHealthStatus.warning,
  ServiceHealthStatus.critical,
];

export function getServiceColumns({
  query,
  showTransactionTypeColumn,
  comparisonData,
}: {
  query: Record<string, string | undefined>;
  showTransactionTypeColumn: boolean;
  comparisonData?: ServicesDetailedStatisticsAPIResponse;
}): Array<ITableColumn<ServiceListItem>> {
  return [
    {
      field: 'healthStatus',
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
    },
    {
      field: 'serviceName',
      name: i18n.translate('xpack.apm.servicesTable.nameColumnLabel', {
        defaultMessage: 'Name',
      }),
      width: '40%',
      sortable: true,
      render: (_, { serviceName, agentName }) => (
        <ToolTipWrapper data-test-subj="apmServiceListAppLink">
          <EuiToolTip
            delay="long"
            content={formatString(serviceName)}
            id="service-name-tooltip"
            anchorClassName="apmServiceList__serviceNameTooltip"
          >
            <ServiceLink
              agentName={agentName}
              query={query}
              serviceName={serviceName}
            />
          </EuiToolTip>
        </ToolTipWrapper>
      ),
    },
    {
      field: 'environments',
      name: i18n.translate('xpack.apm.servicesTable.environmentColumnLabel', {
        defaultMessage: 'Environment',
      }),
      width: `${unit * 10}px`,
      sortable: true,
      render: (_, { environments }) => (
        <EnvironmentBadge environments={environments ?? []} />
      ),
    },
    ...(showTransactionTypeColumn
      ? [
          {
            field: 'transactionType',
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
      field: 'latency',
      name: i18n.translate('xpack.apm.servicesTable.latencyAvgColumnLabel', {
        defaultMessage: 'Latency (avg.)',
      }),
      sortable: true,
      dataType: 'number',
      render: (_, { serviceName, latency }) => (
        <ServiceListMetric
          series={comparisonData?.currentPeriod[serviceName]?.latency}
          comparisonSeries={
            comparisonData?.previousPeriod[serviceName]?.latency
          }
          color="euiColorVis1"
          valueLabel={asMillisecondDuration(latency || 0)}
        />
      ),
      align: 'left',
      width: `${unit * 10}px`,
    },
    {
      field: 'throughput',
      name: i18n.translate('xpack.apm.servicesTable.throughputColumnLabel', {
        defaultMessage: 'Throughput',
      }),
      sortable: true,
      dataType: 'number',
      render: (_, { serviceName, throughput }) => (
        <ServiceListMetric
          series={comparisonData?.currentPeriod[serviceName]?.throughput}
          comparisonSeries={
            comparisonData?.previousPeriod[serviceName]?.throughput
          }
          color="euiColorVis0"
          valueLabel={asTransactionRate(throughput)}
        />
      ),
      align: 'left',
      width: `${unit * 10}px`,
    },
    {
      field: 'transactionErrorRate',
      name: i18n.translate('xpack.apm.servicesTable.transactionErrorRate', {
        defaultMessage: 'Error rate %',
      }),
      sortable: true,
      dataType: 'number',
      render: (_, { serviceName, transactionErrorRate }) => {
        const valueLabel = asPercent(transactionErrorRate, 1);
        return (
          <ServiceListMetric
            series={
              comparisonData?.currentPeriod[serviceName]?.transactionErrorRate
            }
            comparisonSeries={
              comparisonData?.previousPeriod[serviceName]?.transactionErrorRate
            }
            color="euiColorVis7"
            valueLabel={valueLabel}
          />
        );
      },
      align: 'left',
      width: `${unit * 10}px`,
    },
  ];
}

interface Props {
  items: Items;
  comparisonData?: ServicesDetailedStatisticsAPIResponse;
  noItemsMessage?: React.ReactNode;
  isLoading: boolean;
}

export function ServiceList({
  items,
  noItemsMessage,
  comparisonData,
  isLoading,
}: Props) {
  const displayHealthStatus = items.some((item) => 'healthStatus' in item);

  const showTransactionTypeColumn = items.some(
    ({ transactionType }) =>
      transactionType !== TRANSACTION_REQUEST &&
      transactionType !== TRANSACTION_PAGE_LOAD
  );

  const { query } = useApmParams('/services');

  const serviceColumns = useMemo(
    () =>
      getServiceColumns({ query, showTransactionTypeColumn, comparisonData }),
    [query, showTransactionTypeColumn, comparisonData]
  );

  const columns = displayHealthStatus
    ? serviceColumns
    : serviceColumns.filter((column) => column.field !== 'healthStatus');
  const initialSortField = displayHealthStatus
    ? 'healthStatus'
    : 'transactionsPerMinute';

  return (
    <EuiFlexGroup
      gutterSize="xs"
      direction="column"
      responsive={false}
      alignItems="flexEnd"
    >
      <EuiFlexItem>
        <EuiFlexGroup responsive={false} alignItems="center" gutterSize="xs">
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
        <ManagedTable
          isLoading={isLoading}
          columns={columns}
          items={items}
          noItemsMessage={noItemsMessage}
          initialSortField={initialSortField}
          initialSortDirection="desc"
          initialPageSize={50}
          sortFn={(itemsToSort, sortField, sortDirection) => {
            // For healthStatus, sort items by healthStatus first, then by TPM
            return sortField === 'healthStatus'
              ? orderBy(
                  itemsToSort,
                  [
                    (item) => {
                      return item.healthStatus
                        ? SERVICE_HEALTH_STATUS_ORDER.indexOf(item.healthStatus)
                        : -1;
                    },
                    (item) => item.throughput ?? 0,
                  ],
                  [sortDirection, sortDirection]
                )
              : orderBy(
                  itemsToSort,
                  (item) => {
                    switch (sortField) {
                      // Use `?? -1` here so `undefined` will appear after/before `0`.
                      // In the table this will make the "N/A" items always at the
                      // bottom/top.
                      case 'latency':
                        return item.latency ?? -1;
                      case 'throughput':
                        return item.throughput ?? -1;
                      case 'transactionErrorRate':
                        return item.transactionErrorRate ?? -1;
                      default:
                        return item[sortField as keyof typeof item];
                    }
                  },
                  sortDirection
                );
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
