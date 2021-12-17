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
  EuiLink,
  EuiText,
  EuiToolTip,
  RIGHT_ALIGNMENT,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { orderBy } from 'lodash';
import React, { useMemo } from 'react';
import { ValuesType } from 'utility-types';
import { stringify } from 'query-string';
import { euiStyled } from '../../../../../../../../../src/plugins/kibana_react/common';
import { useKibana } from '../../../../../../../../../src/plugins/kibana_react/public';
import { NOT_AVAILABLE_LABEL } from '../../../../../../common/i18n';
import { ServiceHealthStatus } from '../../../../../../common/service_health_status';
import {
  TRANSACTION_PAGE_LOAD,
  TRANSACTION_REQUEST,
} from '../../../../../../common/transaction_types';
import {
  asMillisecondDuration,
  asPercent,
  asTransactionRate,
} from '../../../../../../common/utils/formatters';
import {
  Breakpoints,
  useBreakpoints,
} from '../../../../../hooks/use_breakpoints';
import { APIReturnType } from '../../../../../services/rest/createCallApmApi';
import { unit, truncate } from '../../../../../utils/style';
import { AgentIcon } from '../../../../shared/agent_icon';
import { EnvironmentBadge } from '../../../../shared/EnvironmentBadge';
import { ListMetric } from '../../../../shared/list_metric';
import { ITableColumn, ManagedTable } from '../../../../shared/managed_table';
import { TruncateWithTooltip } from '../../../../shared/truncate_with_tooltip';
import { HealthBadge } from './HealthBadge';

const StyledLink = euiStyled(EuiLink)`${truncate('100%')};`;

interface ServiceParams {
  comparisonEnabled?: boolean;
  comparisonType?: 'week' | 'day' | 'period';
  rangeFrom?: string;
  rangeTo?: string;
  environment?: string;
  kuery?: string;
}

type ServiceListAPIResponse = APIReturnType<'GET /internal/apm/services'>;
type Items = ServiceListAPIResponse['items'];
type ServicesDetailedStatisticsAPIResponse =
  APIReturnType<'GET /internal/apm/services/detailed_statistics'>;

type ServiceListItem = ValuesType<Items>;

function formatString(value?: string | null) {
  return value || NOT_AVAILABLE_LABEL;
}

const SERVICE_HEALTH_STATUS_ORDER = [
  ServiceHealthStatus.unknown,
  ServiceHealthStatus.healthy,
  ServiceHealthStatus.warning,
  ServiceHealthStatus.critical,
];

export function getServiceColumns({
  showTransactionTypeColumn,
  comparisonData,
  breakpoints,
  showHealthStatusColumn,
  serviceParams,
  http,
}: {
  showTransactionTypeColumn: boolean;
  showHealthStatusColumn: boolean;
  breakpoints: Breakpoints;
  comparisonData?: ServicesDetailedStatisticsAPIResponse;
  serviceParams: ServiceParams;
  http: HttpSetup;
}): Array<ITableColumn<ServiceListItem>> {
  const { isSmall, isLarge, isXl } = breakpoints;
  const showWhenSmallOrGreaterThanLarge = isSmall || !isLarge;
  const showWhenSmallOrGreaterThanXL = isSmall || !isXl;
  const params = stringify(serviceParams);
  return [
    ...(showHealthStatusColumn
      ? [
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
          } as ITableColumn<ServiceListItem>,
        ]
      : []),
    {
      field: 'serviceName',
      name: i18n.translate('xpack.apm.servicesTable.nameColumnLabel', {
        defaultMessage: 'Name',
      }),
      sortable: true,
      render: (_, { serviceName, agentName }) => (
        <TruncateWithTooltip
          data-test-subj="apmServiceListAppLink"
          text={formatString(serviceName)}
          content={
            <StyledLink
              data-test-subj={`serviceLink_${agentName}`}
              href={http.basePath.prepend(
                `/app/apm/services/${serviceName}/overview?${params}`
              )}
            >
              <EuiFlexGroup
                alignItems="center"
                gutterSize="s"
                responsive={false}
              >
                <EuiFlexItem grow={false}>
                  <AgentIcon agentName={agentName} />
                </EuiFlexItem>
                <EuiFlexItem>{serviceName}</EuiFlexItem>
              </EuiFlexGroup>
            </StyledLink>
          }
        />
      ),
    },
    ...(showWhenSmallOrGreaterThanLarge
      ? [
          {
            field: 'environments',
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
        <ListMetric
          series={comparisonData?.currentPeriod[serviceName]?.latency}
          comparisonSeries={
            comparisonData?.previousPeriod[serviceName]?.latency
          }
          hideSeries={!showWhenSmallOrGreaterThanLarge}
          color="euiColorVis1"
          valueLabel={asMillisecondDuration(latency || 0)}
        />
      ),
      align: RIGHT_ALIGNMENT,
    },
    {
      field: 'throughput',
      name: i18n.translate('xpack.apm.servicesTable.throughputColumnLabel', {
        defaultMessage: 'Throughput',
      }),
      sortable: true,
      dataType: 'number',
      render: (_, { serviceName, throughput }) => (
        <ListMetric
          series={comparisonData?.currentPeriod[serviceName]?.throughput}
          comparisonSeries={
            comparisonData?.previousPeriod[serviceName]?.throughput
          }
          hideSeries={!showWhenSmallOrGreaterThanLarge}
          color="euiColorVis0"
          valueLabel={asTransactionRate(throughput)}
        />
      ),
      align: RIGHT_ALIGNMENT,
    },
    {
      field: 'transactionErrorRate',
      name: i18n.translate('xpack.apm.servicesTable.transactionErrorRate', {
        defaultMessage: 'Failed transaction rate',
      }),
      sortable: true,
      dataType: 'number',
      render: (_, { serviceName, transactionErrorRate }) => {
        const valueLabel = asPercent(transactionErrorRate, 1);
        return (
          <ListMetric
            series={
              comparisonData?.currentPeriod[serviceName]?.transactionErrorRate
            }
            comparisonSeries={
              comparisonData?.previousPeriod[serviceName]?.transactionErrorRate
            }
            hideSeries={!showWhenSmallOrGreaterThanLarge}
            color="euiColorVis7"
            valueLabel={valueLabel}
          />
        );
      },
      align: RIGHT_ALIGNMENT,
    },
  ];
}

interface Props {
  items: Items;
  comparisonData?: ServicesDetailedStatisticsAPIResponse;
  noItemsMessage?: React.ReactNode;
  isLoading: boolean;
  isFailure?: boolean;
  serviceParams: ServiceParams;
}

export function ServiceList({
  items,
  noItemsMessage,
  comparisonData,
  isLoading,
  isFailure,
  serviceParams,
}: Props) {
  const {
    services: { http },
  } = useKibana();

  const breakpoints = useBreakpoints();
  const displayHealthStatus = items.some((item) => 'healthStatus' in item);

  const showTransactionTypeColumn = items.some(
    ({ transactionType }) =>
      transactionType !== TRANSACTION_REQUEST &&
      transactionType !== TRANSACTION_PAGE_LOAD
  );

  const serviceColumns = useMemo(
    () =>
      getServiceColumns({
        showTransactionTypeColumn,
        comparisonData,
        breakpoints,
        showHealthStatusColumn: displayHealthStatus,
        serviceParams,
        http,
      }),
    [
      showTransactionTypeColumn,
      comparisonData,
      breakpoints,
      displayHealthStatus,
      serviceParams,
      http,
    ]
  );

  const initialSortField = displayHealthStatus
    ? 'healthStatus'
    : 'transactionsPerMinute';

  return (
    <EuiFlexGroup gutterSize="xs" direction="column" responsive={false}>
      <EuiFlexItem>
        <EuiFlexGroup
          alignItems="center"
          gutterSize="xs"
          justifyContent="flexEnd"
        >
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
          error={isFailure}
          columns={serviceColumns}
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
