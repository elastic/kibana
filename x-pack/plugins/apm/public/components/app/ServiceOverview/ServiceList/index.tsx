/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexItem, EuiFlexGroup, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import styled from 'styled-components';
import { ValuesType } from 'utility-types';
import { orderBy } from 'lodash';
import { ServiceHealthStatus } from '../../../../../common/service_health_status';
import {
  asPercent,
  asDecimal,
  asMillisecondDuration,
} from '../../../../../common/utils/formatters';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ServiceListAPIResponse } from '../../../../../server/lib/services/get_services';
import { NOT_AVAILABLE_LABEL } from '../../../../../common/i18n';
import { fontSizes, px, truncate, unit } from '../../../../style/variables';
import { ManagedTable, ITableColumn } from '../../../shared/ManagedTable';
import { EnvironmentBadge } from '../../../shared/EnvironmentBadge';
import { TransactionOverviewLink } from '../../../shared/Links/apm/TransactionOverviewLink';
import { AgentIcon } from '../../../shared/AgentIcon';
import { HealthBadge } from './HealthBadge';
import { ServiceListMetric } from './ServiceListMetric';

interface Props {
  items: ServiceListAPIResponse['items'];
  noItemsMessage?: React.ReactNode;
}

type ServiceListItem = ValuesType<Props['items']>;

function formatNumber(value: number) {
  if (value === 0) {
    return '0';
  } else if (value <= 0.1) {
    return '< 0.1';
  } else {
    return asDecimal(value);
  }
}

function formatString(value?: string | null) {
  return value || NOT_AVAILABLE_LABEL;
}

const AppLink = styled(TransactionOverviewLink)`
  font-size: ${fontSizes.large};
  ${truncate('100%')};
`;

export const SERVICE_COLUMNS: Array<ITableColumn<ServiceListItem>> = [
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
      <EuiToolTip
        delay="long"
        content={formatString(serviceName)}
        id="service-name-tooltip"
      >
        <EuiFlexGroup gutterSize="s" alignItems="center">
          {agentName && (
            <EuiFlexItem grow={false}>
              <AgentIcon agentName={agentName} />
            </EuiFlexItem>
          )}
          <EuiFlexItem>
            <AppLink serviceName={serviceName}>
              {formatString(serviceName)}
            </AppLink>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiToolTip>
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
  {
    field: 'avgResponseTime',
    name: i18n.translate('xpack.apm.servicesTable.avgResponseTimeColumnLabel', {
      defaultMessage: 'Avg. response time',
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
    name: i18n.translate(
      'xpack.apm.servicesTable.transactionsPerMinuteColumnLabel',
      {
        defaultMessage: 'Trans. per minute',
      }
    ),
    sortable: true,
    dataType: 'number',
    render: (_, { transactionsPerMinute }) => (
      <ServiceListMetric
        series={transactionsPerMinute?.timeseries}
        color="euiColorVis0"
        valueLabel={`${formatNumber(
          transactionsPerMinute?.value || 0
        )} ${i18n.translate(
          'xpack.apm.servicesTable.transactionsPerMinuteUnitLabel',
          {
            defaultMessage: 'tpm',
          }
        )}`}
      />
    ),
    align: 'left',
    width: px(unit * 10),
  },
  {
    field: 'errorsPerMinute',
    name: i18n.translate('xpack.apm.servicesTable.transactionErrorRate', {
      defaultMessage: 'Error rate %',
    }),
    sortable: true,
    dataType: 'number',
    render: (_, { transactionErrorRate }) => {
      const value = transactionErrorRate?.value;

      const valueLabel =
        value !== null && value !== undefined ? asPercent(value, 1) : '';

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

const SERVICE_HEALTH_STATUS_ORDER = [
  ServiceHealthStatus.unknown,
  ServiceHealthStatus.healthy,
  ServiceHealthStatus.warning,
  ServiceHealthStatus.critical,
];

export function ServiceList({ items, noItemsMessage }: Props) {
  const displayHealthStatus = items.some((item) => 'healthStatus' in item);

  const columns = displayHealthStatus
    ? SERVICE_COLUMNS
    : SERVICE_COLUMNS.filter((column) => column.field !== 'healthStatus');
  const initialSortField = displayHealthStatus
    ? 'healthStatus'
    : 'transactionsPerMinute';

  return (
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
                  case 'avgResponseTime':
                    return item.avgResponseTime?.value ?? 0;
                  case 'transactionsPerMinute':
                    return item.transactionsPerMinute?.value ?? 0;
                  case 'transactionErrorRate':
                    return item.transactionErrorRate?.value ?? 0;

                  default:
                    return item[sortField as keyof typeof item];
                }
              },
              sortDirection
            );
      }}
    />
  );
}
