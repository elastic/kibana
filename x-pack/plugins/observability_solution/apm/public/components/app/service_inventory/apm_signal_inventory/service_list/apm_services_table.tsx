/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  RIGHT_ALIGNMENT,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getSurveyFeedbackURL } from '@kbn/observability-shared-plugin/public';
import { ALERT_STATUS_ACTIVE } from '@kbn/rule-data-utils';
import { TypeOf } from '@kbn/typed-react-router-config';
import { omit } from 'lodash';
import React, { useContext, useMemo } from 'react';
import { ServiceHealthStatus } from '../../../../../../common/service_health_status';
import {
  ServiceInventoryFieldName,
  ServiceListItem,
} from '../../../../../../common/service_inventory';
import { isDefaultTransactionType } from '../../../../../../common/transaction_types';
import {
  asMillisecondDuration,
  asPercent,
  asTransactionRate,
} from '../../../../../../common/utils/formatters';
import { KibanaEnvironmentContext } from '../../../../../context/kibana_environment_context/kibana_environment_context';
import { useApmParams } from '../../../../../hooks/use_apm_params';
import { useApmRouter } from '../../../../../hooks/use_apm_router';
import { Breakpoints, useBreakpoints } from '../../../../../hooks/use_breakpoints';
import { useFallbackToTransactionsFetcher } from '../../../../../hooks/use_fallback_to_transactions_fetcher';
import { FETCH_STATUS, isFailure, isPending } from '../../../../../hooks/use_fetcher';
import { APIReturnType } from '../../../../../services/rest/create_call_apm_api';
import { unit } from '../../../../../utils/style';
import { ApmRoutes } from '../../../../routing/apm_route_config';
import { AggregatedTransactionsBadge } from '../../../../shared/aggregated_transactions_badge';
import {
  ChartType,
  getTimeSeriesColor,
} from '../../../../shared/charts/helper/get_timeseries_color';
import { EnvironmentBadge } from '../../../../shared/environment_badge';
import { ServiceLink } from '../../../../shared/links/apm/service_link';
import { ListMetric } from '../../../../shared/list_metric';
import {
  ITableColumn,
  ManagedTable,
  SortFunction,
  TableSearchBar,
} from '../../../../shared/managed_table';
import { TryItButton } from '../../../../shared/try_it_button';
import { HealthBadge } from './health_badge';
import { ColumnHeaderWithTooltip } from './column_header_with_tooltip';

type ServicesDetailedStatisticsAPIResponse =
  APIReturnType<'POST /internal/apm/services/detailed_statistics'>;

export function getServiceColumns({
  query,
  showTransactionTypeColumn,
  comparisonDataLoading,
  comparisonData,
  breakpoints,
  showHealthStatusColumn,
  showAlertsColumn,
  link,
  serviceOverflowCount,
}: {
  query: TypeOf<ApmRoutes, '/services'>['query'];
  showTransactionTypeColumn: boolean;
  showHealthStatusColumn: boolean;
  showAlertsColumn: boolean;
  comparisonDataLoading: boolean;
  breakpoints: Breakpoints;
  comparisonData?: ServicesDetailedStatisticsAPIResponse;
  link: any;
  serviceOverflowCount: number;
}): Array<ITableColumn<ServiceListItem>> {
  const { isSmall, isLarge, isXl } = breakpoints;
  const showWhenSmallOrGreaterThanLarge = isSmall || !isLarge;
  const showWhenSmallOrGreaterThanXL = isSmall || !isXl;

  return [
    ...(showAlertsColumn
      ? [
          {
            field: ServiceInventoryFieldName.AlertsCount,
            name: (
              <ColumnHeaderWithTooltip
                tooltipContent={i18n.translate('xpack.apm.servicesTable.tooltip.alertsCount', {
                  defaultMessage: 'The count of the active alerts',
                })}
                label={i18n.translate('xpack.apm.servicesTable.alertsColumnLabel', {
                  defaultMessage: 'Alerts',
                })}
              />
            ),
            width: `${unit * 6}px`,
            sortable: true,
            render: (_, { serviceName, alertsCount }) => {
              if (!alertsCount) {
                return null;
              }

              return (
                <EuiToolTip
                  position="bottom"
                  content={i18n.translate(
                    'xpack.apm.home.servicesTable.tooltip.activeAlertsExplanation',
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
                        alertStatus: ALERT_STATUS_ACTIVE,
                      },
                    })}
                  >
                    {alertsCount}
                  </EuiBadge>
                </EuiToolTip>
              );
            },
          } as ITableColumn<ServiceListItem>,
        ]
      : []),
    ...(showHealthStatusColumn
      ? [
          {
            field: ServiceInventoryFieldName.HealthStatus,
            name: (
              <>
                {i18n.translate('xpack.apm.servicesTable.healthColumnLabel', {
                  defaultMessage: 'Health',
                })}{' '}
                <EuiIconTip
                  iconProps={{
                    className: 'eui-alignTop',
                  }}
                  position="right"
                  color="subdued"
                  content={i18n.translate('xpack.apm.servicesTable.healthColumnLabel.tooltip', {
                    defaultMessage:
                      'Health status is determined by the latency anomalies detected by the ML jobs specific to the selected service environment and the supported transaction types. These transaction types include "page-load", "request", and "mobile".',
                  })}
                />
              </>
            ),
            width: `${unit * 6}px`,
            sortable: true,
            render: (_, { healthStatus }) => {
              return <HealthBadge healthStatus={healthStatus ?? ServiceHealthStatus.unknown} />;
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
        <ServiceLink
          agentName={agentName}
          query={{ ...query, transactionType }}
          serviceName={serviceName}
          serviceOverflowCount={serviceOverflowCount}
        />
      ),
    },
    ...(showWhenSmallOrGreaterThanLarge
      ? [
          {
            field: ServiceInventoryFieldName.Environments,
            name: i18n.translate('xpack.apm.servicesTable.environmentColumnLabel', {
              defaultMessage: 'Environment',
            }),
            width: `${unit * 9}px`,
            sortable: true,
            render: (_, { environments }) => <EnvironmentBadge environments={environments ?? []} />,
          } as ITableColumn<ServiceListItem>,
        ]
      : []),
    ...(showTransactionTypeColumn && showWhenSmallOrGreaterThanXL
      ? [
          {
            field: ServiceInventoryFieldName.TransactionType,
            name: i18n.translate('xpack.apm.servicesTable.transactionColumnLabel', {
              defaultMessage: 'Transaction type',
            }),
            width: `${unit * 8}px`,
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
            comparisonSeries={comparisonData?.previousPeriod[serviceName]?.latency}
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
            comparisonSeries={comparisonData?.previousPeriod[serviceName]?.throughput}
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
            series={comparisonData?.currentPeriod[serviceName]?.transactionErrorRate}
            comparisonSeries={comparisonData?.previousPeriod[serviceName]?.transactionErrorRate}
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
  status: FETCH_STATUS;
  items: ServiceListItem[];
  comparisonDataLoading: boolean;
  comparisonData?: ServicesDetailedStatisticsAPIResponse;
  noItemsMessage?: React.ReactNode;
  displayHealthStatus: boolean;
  displayAlerts: boolean;
  initialSortField: ServiceInventoryFieldName;
  initialPageSize: number;
  initialSortDirection: 'asc' | 'desc';
  sortFn: SortFunction<ServiceListItem>;
  serviceOverflowCount: number;
  maxCountExceeded: boolean;
  onChangeSearchQuery: (searchQuery: string) => void;
  onChangeRenderedItems: (renderedItems: ServiceListItem[]) => void;
  isTableSearchBarEnabled: boolean;
  isSavingSetting: boolean;
  onChangeTableSearchBarVisibility: () => void;
}
export function ApmServicesTable({
  status,
  items,
  noItemsMessage,
  comparisonDataLoading,
  comparisonData,
  displayHealthStatus,
  displayAlerts,
  initialSortField,
  initialSortDirection,
  initialPageSize,
  sortFn,
  serviceOverflowCount,
  maxCountExceeded,
  onChangeSearchQuery,
  onChangeRenderedItems,
  isTableSearchBarEnabled,
  isSavingSetting,
  onChangeTableSearchBarVisibility,
}: Props) {
  const { kibanaVersion, isCloudEnv, isServerlessEnv } = useContext(KibanaEnvironmentContext);
  const breakpoints = useBreakpoints();
  const { link } = useApmRouter();
  const showTransactionTypeColumn = items.some(
    ({ transactionType }) => transactionType && !isDefaultTransactionType(transactionType)
  );

  const { query } = useApmParams('/services');
  const { kuery } = query;
  const { fallbackToTransactions } = useFallbackToTransactionsFetcher({
    kuery,
  });

  const serviceColumns = useMemo(() => {
    return getServiceColumns({
      // removes pagination and sort instructions from the query so it won't be passed down to next route
      query: omit(query, 'page', 'pageSize', 'sortDirection', 'sortField'),
      showTransactionTypeColumn,
      comparisonDataLoading,
      comparisonData,
      breakpoints,
      showHealthStatusColumn: displayHealthStatus,
      showAlertsColumn: displayAlerts,
      link,
      serviceOverflowCount,
    });
  }, [
    query,
    showTransactionTypeColumn,
    comparisonDataLoading,
    comparisonData,
    breakpoints,
    displayHealthStatus,
    displayAlerts,
    link,
    serviceOverflowCount,
  ]);

  const tableSearchBar: TableSearchBar<ServiceListItem> = useMemo(() => {
    return {
      isEnabled: isTableSearchBarEnabled,
      fieldsToSearch: ['serviceName'],
      maxCountExceeded,
      onChangeSearchQuery,
      placeholder: i18n.translate('xpack.apm.servicesTable.filterServicesPlaceholder', {
        defaultMessage: 'Search services by name',
      }),
    };
  }, [isTableSearchBarEnabled, maxCountExceeded, onChangeSearchQuery]);

  return (
    <EuiFlexGroup gutterSize="xs" direction="column" responsive={false}>
      <EuiFlexItem>
        <TryItButton
          isFeatureEnabled={isTableSearchBarEnabled}
          linkLabel={
            isTableSearchBarEnabled
              ? i18n.translate('xpack.apm.serviceList.disableFastFilter', {
                  defaultMessage: 'Disable fast filter',
                })
              : i18n.translate('xpack.apm.serviceList.enableFastFilter', {
                  defaultMessage: 'Enable fast filter',
                })
          }
          onClick={onChangeTableSearchBarVisibility}
          isLoading={isSavingSetting}
          popoverContent={
            <EuiFlexGroup direction="column" gutterSize="s">
              <EuiFlexItem grow={false}>
                {i18n.translate('xpack.apm.serviceList.turnOffFastFilter', {
                  defaultMessage:
                    'Fast filtering allows you to instantly search for your services using free text.',
                })}
              </EuiFlexItem>
              {isTableSearchBarEnabled && (
                <EuiFlexItem grow={false}>
                  <EuiLink
                    data-test-subj="apmServiceListGiveFeedbackLink"
                    href={getSurveyFeedbackURL({
                      formUrl: 'https://ela.st/service-inventory-fast-filter-feedback',
                      kibanaVersion,
                      isCloudEnv,
                      isServerlessEnv,
                    })}
                    target="_blank"
                  >
                    {i18n.translate('xpack.apm.serviceList.giveFeedbackFlexItemLabel', {
                      defaultMessage: 'Give feedback',
                    })}
                  </EuiLink>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          }
        />
        <EuiSpacer size="s" />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup alignItems="center" gutterSize="xs" justifyContent="flexEnd">
          {fallbackToTransactions && (
            <EuiFlexItem>
              <AggregatedTransactionsBadge />
            </EuiFlexItem>
          )}
          {maxCountExceeded && (
            <EuiFlexItem grow={false}>
              <EuiIconTip
                position="top"
                type="warning"
                color="danger"
                content={i18n.translate('xpack.apm.servicesTable.tooltip.maxCountExceededWarning', {
                  defaultMessage:
                    'The limit of 1,000 services is exceeded. Please use the query bar to narrow down the results or create service groups.',
                })}
              />
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <EuiIconTip
              position="top"
              type="questionInCircle"
              color="subdued"
              content={i18n.translate('xpack.apm.servicesTable.tooltip.metricsExplanation', {
                defaultMessage:
                  'Service metrics are aggregated on their transaction type, which can be request or page-load. If neither exists, metrics are aggregated on the top available transaction type.',
              })}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {i18n.translate('xpack.apm.servicesTable.metricsExplanationLabel', {
                defaultMessage: 'What are these metrics?',
              })}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <ManagedTable<ServiceListItem>
          isLoading={isPending(status)}
          error={isFailure(status)}
          columns={serviceColumns}
          items={items}
          noItemsMessage={noItemsMessage}
          initialSortField={initialSortField}
          initialSortDirection={initialSortDirection}
          initialPageSize={initialPageSize}
          sortFn={sortFn}
          onChangeRenderedItems={onChangeRenderedItems}
          tableSearchBar={tableSearchBar}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
