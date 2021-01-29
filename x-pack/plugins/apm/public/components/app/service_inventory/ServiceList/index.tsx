/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexItem, EuiFlexGroup, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import styled from 'styled-components';
import { ValuesType } from 'utility-types';
import { orderBy } from 'lodash';
import { EuiIcon } from '@elastic/eui';
import { EuiText } from '@elastic/eui';
import {
  TRANSACTION_PAGE_LOAD,
  TRANSACTION_REQUEST,
} from '../../../../../common/transaction_types';
import { APIReturnType } from '../../../../services/rest/createCallApmApi';
import { ServiceHealthStatus } from '../../../../../common/service_health_status';
import {
  asPercent,
  asMillisecondDuration,
  asTransactionRate,
} from '../../../../../common/utils/formatters';
import { NOT_AVAILABLE_LABEL } from '../../../../../common/i18n';
import { fontSizes, px, truncate, unit } from '../../../../style/variables';
import { ManagedTable, ITableColumn } from '../../../shared/ManagedTable';
import { EnvironmentBadge } from '../../../shared/EnvironmentBadge';
import { ServiceOrTransactionsOverviewLink } from '../../../shared/Links/apm/service_transactions_overview_link';
import { AgentIcon } from '../../../shared/AgentIcon';
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

const AppLink = styled(ServiceOrTransactionsOverviewLink)`
  font-size: ${fontSizes.large};
  ${truncate('100%')};
`;

const ToolTipWrapper = styled.span`
  width: 100%;
  .apmServiceList__serviceNameTooltip {
    width: 100%;
    .apmServiceList__serviceNameContainer {
      // removes 24px referent to the icon placed on the left side of the text.
      width: calc(100% - 24px);
    }
  }
`;

const SERVICE_HEALTH_STATUS_ORDER = [
  ServiceHealthStatus.unknown,
  ServiceHealthStatus.healthy,
  ServiceHealthStatus.warning,
  ServiceHealthStatus.critical,
];

export function getServiceColumns({
  showTransactionTypeColumn,
}: {
  showTransactionTypeColumn: boolean;
}): Array<ITableColumn<ServiceListItem>> {
  return [
    {
      field: 'healthStatus',
      name: i18n.translate('xpack.apm.servicesTable.healthColumnLabel', {
        defaultMessage: 'Health',
      }),
      width: px(unit * 6),
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
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              {agentName && (
                <EuiFlexItem grow={false}>
                  <AgentIcon agentName={agentName} />
                </EuiFlexItem>
              )}
              <EuiFlexItem className="apmServiceList__serviceNameContainer">
                <AppLink serviceName={serviceName} className="eui-textTruncate">
                  {formatString(serviceName)}
                </AppLink>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiToolTip>
        </ToolTipWrapper>
      ),
    },
    {
      field: 'environments',
      name: i18n.translate('xpack.apm.servicesTable.environmentColumnLabel', {
        defaultMessage: 'Environment',
      }),
      width: px(unit * 10),
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
            width: px(unit * 10),
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
      width: px(unit * 10),
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
      width: px(unit * 10),
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
      width: px(unit * 10),
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

  const serviceColumns = useMemo(
    () => getServiceColumns({ showTransactionTypeColumn }),
    [showTransactionTypeColumn]
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
