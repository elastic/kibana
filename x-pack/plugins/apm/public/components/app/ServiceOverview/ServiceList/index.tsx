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
import { asPercent } from '../../../../../common/utils/formatters';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ServiceListAPIResponse } from '../../../../../server/lib/services/get_services';
import { NOT_AVAILABLE_LABEL } from '../../../../../common/i18n';
import { fontSizes, px, truncate, unit } from '../../../../style/variables';
import { asDecimal, asMillisecondDuration } from '../../../../utils/formatters';
import { ManagedTable, ITableColumn } from '../../../shared/ManagedTable';
import { EnvironmentBadge } from '../../../shared/EnvironmentBadge';
import { TransactionOverviewLink } from '../../../shared/Links/apm/TransactionOverviewLink';
import { AgentIcon } from '../../../shared/AgentIcon';
import { Severity } from '../../../../../common/anomaly_detection';
import { HealthBadge } from './HealthBadge';
import { ServiceListMetric } from './ServiceListMetric';

interface Props {
  items: ServiceListAPIResponse['items'];
  noItemsMessage?: React.ReactNode;
  displayHealthStatus: boolean;
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
    field: 'severity',
    name: i18n.translate('xpack.apm.servicesTable.healthColumnLabel', {
      defaultMessage: 'Health',
    }),
    width: px(unit * 6),
    sortable: true,
    render: (_, { severity }) => {
      return <HealthBadge severity={severity} />;
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

const SEVERITY_ORDER = [
  Severity.warning,
  Severity.minor,
  Severity.major,
  Severity.critical,
];

export function ServiceList({
  items,
  displayHealthStatus,
  noItemsMessage,
}: Props) {
  const columns = displayHealthStatus
    ? SERVICE_COLUMNS
    : SERVICE_COLUMNS.filter((column) => column.field !== 'severity');

  return (
    <ManagedTable
      columns={columns}
      items={items}
      noItemsMessage={noItemsMessage}
      initialSortField="severity"
      initialSortDirection="desc"
      initialPageSize={50}
      sortFn={(itemsToSort, sortField, sortDirection) => {
        // For severity, sort items by severity first, then by TPM

        return sortField === 'severity'
          ? orderBy(
              itemsToSort,
              [
                (item) => {
                  return item.severity
                    ? SEVERITY_ORDER.indexOf(item.severity)
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
