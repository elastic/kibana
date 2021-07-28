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

interface Props {
  items: Items;
  noItemsMessage?: React.ReactNode;
}
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
}: {
  query: Record<string, string | undefined>;
  showTransactionTypeColumn: boolean;
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
        <ToolTipWrapper>
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
      field: 'avgResponseTime',
      name: i18n.translate('xpack.apm.servicesTable.latencyAvgColumnLabel', {
        defaultMessage: 'Latency (avg.)',
      }),
      sortable: true,
      dataType: 'number',
      render: (_, { avgResponseTime }) => (
        <ServiceListMetric
          series={avgResponseTime?.timeseries}
          color="euiColorVis1"
          valueLabel={asMillisecondDuration(avgResponseTime?.value || 0)}
        />
      ),
      align: 'left',
      width: `${unit * 10}px`,
    },
    {
      field: 'transactionsPerMinute',
      name: i18n.translate('xpack.apm.servicesTable.throughputColumnLabel', {
        defaultMessage: 'Throughput',
      }),
      sortable: true,
      dataType: 'number',
      render: (_, { transactionsPerMinute }) => (
        <ServiceListMetric
          series={transactionsPerMinute?.timeseries}
          color="euiColorVis0"
          valueLabel={asTransactionRate(transactionsPerMinute?.value)}
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
      render: (_, { transactionErrorRate }) => {
        const value = transactionErrorRate?.value;

        const valueLabel = asPercent(value, 1);

        return (
          <ServiceListMetric
            series={transactionErrorRate?.timeseries}
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

export function ServiceList({ items, noItemsMessage }: Props) {
  const displayHealthStatus = items.some((item) => 'healthStatus' in item);

  const showTransactionTypeColumn = items.some(
    ({ transactionType }) =>
      transactionType !== TRANSACTION_REQUEST &&
      transactionType !== TRANSACTION_PAGE_LOAD
  );

  const { query } = useApmParams('/services');

  const serviceColumns = useMemo(
    () => getServiceColumns({ query, showTransactionTypeColumn }),
    [query, showTransactionTypeColumn]
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
                    (item) => item.transactionsPerMinute?.value ?? 0,
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
                      case 'avgResponseTime':
                        return item.avgResponseTime?.value ?? -1;
                      case 'transactionsPerMinute':
                        return item.transactionsPerMinute?.value ?? -1;
                      case 'transactionErrorRate':
                        return item.transactionErrorRate?.value ?? -1;
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
