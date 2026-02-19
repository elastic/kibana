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
  EuiText,
  EuiToolTip,
  RIGHT_ALIGNMENT,
} from '@elastic/eui';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { apmEnableServiceInventoryTableSearchBar } from '@kbn/observability-plugin/common';
import { ALERT_STATUS_ACTIVE } from '@kbn/rule-data-utils';
import type { ApmRuleType } from '@kbn/rule-data-utils';
import type { TypeOf } from '@kbn/typed-react-router-config';
import { omit } from 'lodash';
import React, { useCallback, useMemo, useState } from 'react';
import type { AgentName } from '@kbn/elastic-agent-utils';
import { AlertingFlyout } from '../../../alerting/ui_components/alerting_flyout';
import type { ApmPluginStartDeps } from '../../../../plugin';
import { ServiceHealthStatus } from '../../../../../common/service_health_status';
import type { ServiceListItem } from '../../../../../common/service_inventory';
import { ServiceInventoryFieldName } from '../../../../../common/service_inventory';
import { isDefaultTransactionType } from '../../../../../common/transaction_types';
import {
  asMillisecondDuration,
  asPercent,
  asTransactionRate,
} from '../../../../../common/utils/formatters';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import type { Breakpoints } from '../../../../hooks/use_breakpoints';
import { useBreakpoints } from '../../../../hooks/use_breakpoints';
import { useFallbackToTransactionsFetcher } from '../../../../hooks/use_fallback_to_transactions_fetcher';
import type { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { isFailure, isPending, useFetcher } from '../../../../hooks/use_fetcher';
import type { APIReturnType } from '../../../../services/rest/create_call_apm_api';
import { unit } from '../../../../utils/style';
import type { ApmRoutes } from '../../../routing/apm_route_config';
import { AggregatedTransactionsBadge } from '../../../shared/aggregated_transactions_badge';
import { ChartType, getTimeSeriesColor } from '../../../shared/charts/helper/get_timeseries_color';
import { EnvironmentBadge } from '../../../shared/environment_badge';
import { ServiceLink } from '../../../shared/links/apm/service_link';
import { OTHER_SERVICE_NAME } from '../../../shared/links/apm/max_groups_message';
import { ListMetric } from '../../../shared/list_metric';
import type {
  ITableColumn,
  SortFunction,
  TableSearchBar,
  VisibleItemsStartEnd,
} from '../../../shared/managed_table';
import { ManagedTable } from '../../../shared/managed_table';
import { ColumnHeaderWithTooltip } from './column_header_with_tooltip';
import { HealthBadge } from './health_badge';
import { SloStatusBadge } from '../../../shared/slo_status_badge';
import { getESQLQuery, type IndexType } from '../../../shared/links/discover_links/get_esql_query';
import { useServiceActions } from './service_actions';
import {
  APM_SLO_INDICATOR_TYPES,
  type ApmIndicatorType,
} from '../../../../../common/slo_indicator_types';
import { SloOverviewFlyout } from '../../../shared/slo_overview_flyout';
import { ENVIRONMENT_ALL } from '../../../../../common/environment_filter_values';

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
  showSlosColumn,
  link,
  serviceOverflowCount,
  onSloBadgeClick,
}: {
  query: TypeOf<ApmRoutes, '/services'>['query'];
  showTransactionTypeColumn: boolean;
  showHealthStatusColumn: boolean;
  showAlertsColumn: boolean;
  showSlosColumn: boolean;
  comparisonDataLoading: boolean;
  breakpoints: Breakpoints;
  comparisonData?: ServicesDetailedStatisticsAPIResponse;
  link: any;
  serviceOverflowCount: number;
  onSloBadgeClick: (serviceName: string, agentName?: AgentName) => void;
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
                    data-test-subj="serviceInventoryAlertsBadgeLink"
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
    ...(showSlosColumn
      ? [
          {
            field: ServiceInventoryFieldName.SloStatus,
            name: (
              <ColumnHeaderWithTooltip
                tooltipContent={i18n.translate('xpack.apm.servicesTable.tooltip.slosStatus', {
                  defaultMessage: 'The status of APM SLOs for this service',
                })}
                label={i18n.translate('xpack.apm.servicesTable.slosColumnLabel', {
                  defaultMessage: 'SLOs',
                })}
              />
            ),
            width: `${unit * 8}px`,
            sortable: true,
            render: (_, { serviceName, agentName, sloStatus, sloCount }) => {
              if (!sloStatus) {
                return null;
              }

              return (
                <SloStatusBadge
                  sloStatus={sloStatus}
                  sloCount={sloCount}
                  serviceName={serviceName}
                  onClick={() => onSloBadgeClick(serviceName, agentName)}
                />
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
            width: `${unit * 6}px`,
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
  displaySlos: boolean;
  initialSortField: ServiceInventoryFieldName;
  initialPageSize: number;
  initialSortDirection: 'asc' | 'desc';
  sortFn: SortFunction<ServiceListItem>;
  serviceOverflowCount: number;
  maxCountExceeded: boolean;
  onChangeSearchQuery?: (searchQuery: string) => void;
  onChangeRenderedItems?: (renderedItems: ServiceListItem[]) => void;
  onChangeItemIndices?: (range: VisibleItemsStartEnd) => void;
}

export function ApmServicesTable({
  status,
  items,
  noItemsMessage,
  comparisonDataLoading,
  comparisonData,
  displayHealthStatus,
  displayAlerts,
  displaySlos,
  initialSortField,
  initialSortDirection,
  initialPageSize,
  sortFn,
  serviceOverflowCount,
  maxCountExceeded,
  onChangeSearchQuery,
  onChangeRenderedItems,
  onChangeItemIndices,
}: Props) {
  const breakpoints = useBreakpoints();
  const { core, share } = useApmPluginContext();
  const discoverLocator = share.url.locators.get(DISCOVER_APP_LOCATOR);
  const { slo, apmSourcesAccess } = useKibana<ApmPluginStartDeps>().services;
  const { link } = useApmRouter();
  const showTransactionTypeColumn = items.some(
    ({ transactionType }) => transactionType && !isDefaultTransactionType(transactionType)
  );
  const { query } = useApmParams('/services');
  const { kuery, environment } = query;

  const { data: indexSettingsData = { apmIndexSettings: [] } } = useFetcher(
    (_callApmApi, signal) => apmSourcesAccess.getApmIndexSettings({ signal }),
    [apmSourcesAccess]
  );

  const { fallbackToTransactions } = useFallbackToTransactionsFetcher({
    kuery,
  });

  const [alertFlyoutState, setAlertFlyoutState] = useState<{
    isOpen: boolean;
    ruleType: ApmRuleType | null;
    serviceName: string | undefined;
  }>({
    isOpen: false,
    ruleType: null,
    serviceName: undefined,
  });

  const [sloFlyoutState, setSloFlyoutState] = useState<{
    isOpen: boolean;
    indicatorType: ApmIndicatorType | null;
    serviceName: string | undefined;
  }>({
    isOpen: false,
    indicatorType: null,
    serviceName: undefined,
  });

  const openAlertFlyout = useCallback((ruleType: ApmRuleType, serviceName: string) => {
    setAlertFlyoutState({
      isOpen: true,
      ruleType,
      serviceName,
    });
  }, []);

  const closeAlertFlyout = useCallback(() => {
    setAlertFlyoutState({
      isOpen: false,
      ruleType: null,
      serviceName: undefined,
    });
  }, []);

  const openSloFlyout = useCallback((indicatorType: ApmIndicatorType, serviceName: string) => {
    setSloFlyoutState({
      isOpen: true,
      indicatorType,
      serviceName,
    });
  }, []);

  const closeSloFlyout = useCallback(() => {
    setSloFlyoutState({
      isOpen: false,
      indicatorType: null,
      serviceName: undefined,
    });
  }, []);

  const [sloOverviewFlyout, setSloOverviewFlyout] = useState<{
    serviceName: string;
    agentName?: AgentName;
  } | null>(null);

  const openSloOverviewFlyout = useCallback((serviceName: string, agentName?: AgentName) => {
    setSloOverviewFlyout({ serviceName, agentName });
  }, []);

  const closeSloOverviewFlyout = useCallback(() => {
    setSloOverviewFlyout(null);
  }, []);

  const CreateSloFlyout =
    sloFlyoutState.isOpen && sloFlyoutState.indicatorType && sloFlyoutState.serviceName
      ? slo?.getCreateSLOFormFlyout({
          initialValues: {
            name: `APM SLO for ${sloFlyoutState.serviceName}`,
            indicator: {
              type: sloFlyoutState.indicatorType,
              params: {
                service: sloFlyoutState.serviceName,
                environment: environment === ENVIRONMENT_ALL.value ? '*' : environment,
              },
            },
          },
          onClose: closeSloFlyout,
          formSettings: {
            allowedIndicatorTypes: [...APM_SLO_INDICATOR_TYPES],
          },
        })
      : null;

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
      showSlosColumn: displaySlos,
      link,
      serviceOverflowCount,
      onSloBadgeClick: openSloOverviewFlyout,
    });
  }, [
    query,
    showTransactionTypeColumn,
    comparisonDataLoading,
    comparisonData,
    breakpoints,
    displayHealthStatus,
    displayAlerts,
    displaySlos,
    link,
    serviceOverflowCount,
    openSloOverviewFlyout,
  ]);

  const isTableSearchBarEnabled = core.uiSettings.get<boolean>(
    apmEnableServiceInventoryTableSearchBar,
    true
  );

  const tableSearchBar: TableSearchBar<ServiceListItem> = useMemo(() => {
    return {
      isEnabled: isTableSearchBarEnabled,
      fieldsToSearch: ['serviceName'],
      maxCountExceeded,
      onChangeSearchQuery,
      placeholder: i18n.translate('xpack.apm.servicesTable.filterServicesPlaceholder', {
        defaultMessage: 'Search services by name',
      }),
      techPreview: true,
    };
  }, [isTableSearchBarEnabled, maxCountExceeded, onChangeSearchQuery]);

  const getDiscoverHref = useCallback(
    (item: ServiceListItem, indexType: IndexType) => {
      const esqlQuery = getESQLQuery({
        indexType,
        params: {
          kuery,
          serviceName: item.serviceName,
          transactionType: indexType === 'traces' ? item.transactionType : undefined,
          environment,
        },
        indexSettings: indexSettingsData.apmIndexSettings,
      });

      if (!esqlQuery) return undefined;

      return discoverLocator?.getRedirectUrl({
        timeRange: { from: query.rangeFrom, to: query.rangeTo },
        query: { esql: esqlQuery },
      });
    },
    [
      kuery,
      environment,
      indexSettingsData.apmIndexSettings,
      query.rangeFrom,
      query.rangeTo,
      discoverLocator,
    ]
  );

  const serviceActions = useServiceActions({
    openAlertFlyout,
    openSloFlyout,
    getDiscoverHref,
  });

  return (
    <EuiFlexGroup gutterSize="xs" direction="column" responsive={false}>
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
              type="question"
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
          onChangeItemIndices={onChangeItemIndices}
          tableSearchBar={tableSearchBar}
          actions={serviceActions}
          isActionsDisabled={(item: ServiceListItem) => item.serviceName === OTHER_SERVICE_NAME}
        />
      </EuiFlexItem>
      <AlertingFlyout
        addFlyoutVisible={alertFlyoutState.isOpen}
        setAddFlyoutVisibility={(visible) => {
          if (!visible) {
            closeAlertFlyout();
          }
        }}
        ruleType={alertFlyoutState.ruleType}
        serviceName={alertFlyoutState.serviceName}
      />
      {CreateSloFlyout}
      {sloOverviewFlyout && (
        <SloOverviewFlyout
          serviceName={sloOverviewFlyout.serviceName}
          agentName={sloOverviewFlyout.agentName}
          onClose={closeSloOverviewFlyout}
        />
      )}
    </EuiFlexGroup>
  );
}
