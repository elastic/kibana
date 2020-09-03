/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexItem, EuiFlexGroup, EuiBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import styled from 'styled-components';
import { ValuesType } from 'utility-types';
import { orderBy } from 'lodash';
import { useTheme } from '../../../../../../observability/public';
import { useUrlParams } from '../../../../hooks/useUrlParams';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ServiceListAPIResponse } from '../../../../../server/lib/services/get_services';
import { NOT_AVAILABLE_LABEL } from '../../../../../common/i18n';
import { fontSizes, px, truncate } from '../../../../style/variables';
import { asDecimal, asMillisecondDuration } from '../../../../utils/formatters';
import { ManagedTable, ITableColumn } from '../../../shared/ManagedTable';
import { EnvironmentBadge } from '../../../shared/EnvironmentBadge';
import { TransactionOverviewLink } from '../../../shared/Links/apm/TransactionOverviewLink';
import { AgentIcon } from '../../../shared/AgentIcon';
import { SparkPlot } from '../../../shared/charts/SparkPlot';
import { getEmptySeries } from '../../../shared/charts/CustomPlot/getEmptySeries';
import {
  getSeverityColor,
  Severity,
} from '../../../../../common/anomaly_detection';

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

function ServiceListMetric({
  color,
  series,
  valueLabel,
}: {
  color: 'euiColorVis1' | 'euiColorVis0' | 'euiColorVis7';
  series?: Array<{ x: number; y: number | null }>;
  valueLabel: React.ReactNode;
}) {
  const theme = useTheme();

  const {
    urlParams: { start, end },
  } = useUrlParams();

  const colorValue = theme.eui[color];

  return (
    <EuiFlexGroup gutterSize="m">
      <EuiFlexItem grow={false}>
        <SparkPlot
          series={
            series ??
            getEmptySeries(parseFloat(start!), parseFloat(end!))[0].data
          }
          color={colorValue}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={{ whiteSpace: 'nowrap' }}>
        {valueLabel}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function HealthBadge({ severity }: { severity?: Severity }) {
  const theme = useTheme();

  let label: string = '';

  switch (severity) {
    case Severity.critical:
      label = i18n.translate(
        'xpack.apm.servicesTable.serviceHealthStatus.critical',
        {
          defaultMessage: 'Critical',
        }
      );
      break;

    case Severity.major:
    case Severity.minor:
      label = i18n.translate(
        'xpack.apm.servicesTable.serviceHealthStatus.warning',
        {
          defaultMessage: 'Warning',
        }
      );
      break;

    case Severity.warning:
      label = i18n.translate(
        'xpack.apm.servicesTable.serviceHealthStatus.healthy',
        {
          defaultMessage: 'Healthy',
        }
      );
      break;

    default:
      label = i18n.translate(
        'xpack.apm.servicesTable.serviceHealthStatus.unknown',
        {
          defaultMessage: 'Unknown',
        }
      );
      break;
  }

  const unknownColor = theme.eui.euiColorLightShade;

  return (
    <EuiBadge color={getSeverityColor(theme, severity) ?? unknownColor}>
      {label}
    </EuiBadge>
  );
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
    width: px(80),
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
      <EuiToolTip content={formatString(serviceName)} id="service-name-tooltip">
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
    width: px(160),
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
        series={avgResponseTime?.over_time}
        color="euiColorVis1"
        valueLabel={asMillisecondDuration(avgResponseTime?.value || 0)}
      />
    ),
    align: 'left',
    width: px(160),
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
        series={transactionsPerMinute?.over_time}
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
    width: px(160),
  },
  {
    field: 'errorsPerMinute',
    name: i18n.translate('xpack.apm.servicesTable.errorsPerMinuteColumnLabel', {
      defaultMessage: 'Errors per minute',
    }),
    sortable: true,
    dataType: 'number',
    render: (_, { errorsPerMinute }) => (
      <ServiceListMetric
        series={errorsPerMinute?.over_time}
        color="euiColorVis7"
        valueLabel={`${formatNumber(
          errorsPerMinute?.value || 0
        )} ${i18n.translate(
          'xpack.apm.servicesTable.errorsPerMinuteUnitLabel',
          {
            defaultMessage: 'err.',
          }
        )}`}
      />
    ),
    align: 'left',
    width: px(160),
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
                  case 'errorsPerMinute':
                    return item.errorsPerMinute?.value ?? 0;

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
