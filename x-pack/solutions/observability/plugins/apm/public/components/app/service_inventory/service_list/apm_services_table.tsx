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
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { apmEnableServiceInventoryTableSearchBar } from '@kbn/observability-plugin/common';
import { ALERT_STATUS_ACTIVE, ApmRuleType } from '@kbn/rule-data-utils';
import rison from '@kbn/rison';
import type { TypeOf } from '@kbn/typed-react-router-config';
import { omit } from 'lodash';
import React, { useCallback, useMemo, useState } from 'react';
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
import { isFailure, isPending } from '../../../../hooks/use_fetcher';
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
  TableActions,
  VisibleItemsStartEnd,
} from '../../../shared/managed_table';
import { ManagedTable } from '../../../shared/managed_table';
import { ColumnHeaderWithTooltip } from './column_header_with_tooltip';
import { HealthBadge } from './health_badge';

type ServicesDetailedStatisticsAPIResponse =
  APIReturnType<'POST /internal/apm/services/detailed_statistics'>;

export enum SloStatus {
  Violated = 'violated',
  Degrading = 'degrading',
  Healthy = 'healthy',
}

interface SloStatusInfo {
  status: SloStatus;
  count: number;
}

// TODO: Remove this for real implementation
function getSloStatusInfo(serviceName: string): SloStatusInfo {
  if (serviceName === 'frontend-node') {
    return { status: SloStatus.Violated, count: 1 };
  }
  if (serviceName === 'checkoutService') {
    return { status: SloStatus.Healthy, count: 1 };
  }

  let hash = 0;
  for (let i = 0; i < serviceName.length; i++) {
    hash = (hash * 31 + serviceName.charCodeAt(i)) % 1000000007;
  }

  const count = (hash % 5) + 1;

  const statusIndex = hash % 3;
  const status =
    statusIndex === 0
      ? SloStatus.Violated
      : statusIndex === 1
      ? SloStatus.Degrading
      : SloStatus.Healthy;

  return { status, count };
}

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
  onSloHealthyClick,
  basePath,
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
  onSloHealthyClick?: (serviceName: string) => void;
  basePath?: { prepend: (path: string) => string };
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
            name: (
              <ColumnHeaderWithTooltip
                tooltipContent={i18n.translate('xpack.apm.servicesTable.tooltip.slosStatus', {
                  defaultMessage: 'The status of APM SLOs for this service',
                })}
                label={i18n.translate('xpack.apm.servicesTable.slosColumnLabel', {
                  defaultMessage: 'SLOs (APM)',
                })}
              />
            ),
            width: `${unit * 7}px`,
            render: (item: ServiceListItem) => {
              const { serviceName } = item;
              const { status: sloStatus, count: sloCount } = getSloStatusInfo(serviceName);

              const slosUrl = basePath?.prepend(
                `/app/slos?search=${rison.encode({
                  groupBy: 'status',
                  filters: [
                    {
                      meta: {
                        alias: null,
                        disabled: false,
                        key: 'service.name',
                        negate: false,
                        params: { query: serviceName },
                        type: 'phrase',
                      },
                      query: {
                        match_phrase: { 'service.name': serviceName },
                      },
                    },
                    {
                      meta: {
                        alias: null,
                        disabled: false,
                        key: 'slo.indicator.type',
                        negate: false,
                        params: ['sli.apm.transactionDuration', 'sli.apm.transactionErrorRate'],
                        type: 'phrases',
                      },
                      query: {
                        bool: {
                          minimum_should_match: 1,
                          should: [
                            {
                              match_phrase: {
                                'slo.indicator.type': 'sli.apm.transactionDuration',
                              },
                            },
                            {
                              match_phrase: {
                                'slo.indicator.type': 'sli.apm.transactionErrorRate',
                              },
                            },
                          ],
                        },
                      },
                    },
                  ],
                })}`
              );

              if (sloStatus === SloStatus.Violated) {
                return (
                  <EuiToolTip
                    position="bottom"
                    content={i18n.translate('xpack.apm.servicesTable.tooltip.sloViolated', {
                      defaultMessage: 'One or more SLOs are violated. Click to view SLOs.',
                    })}
                  >
                    <EuiBadge
                      data-test-subj="serviceInventorySloViolatedBadge"
                      color="danger"
                      href={slosUrl}
                    >
                      {i18n.translate('xpack.apm.servicesTable.sloViolated', {
                        defaultMessage: '{count} Violated',
                        values: { count: sloCount },
                      })}
                    </EuiBadge>
                  </EuiToolTip>
                );
              }

              if (sloStatus === SloStatus.Degrading) {
                return (
                  <EuiToolTip
                    position="bottom"
                    content={i18n.translate('xpack.apm.servicesTable.tooltip.sloDegrading', {
                      defaultMessage: 'One or more SLOs are degrading. Click to view SLOs.',
                    })}
                  >
                    <EuiBadge
                      data-test-subj="serviceInventorySloDegradingBadge"
                      color="warning"
                      href={slosUrl}
                    >
                      {i18n.translate('xpack.apm.servicesTable.sloDegrading', {
                        defaultMessage: '{count} Degrading',
                        values: { count: sloCount },
                      })}
                    </EuiBadge>
                  </EuiToolTip>
                );
              }

              return (
                <EuiToolTip
                  position="bottom"
                  content={i18n.translate('xpack.apm.servicesTable.tooltip.sloHealthy', {
                    defaultMessage: 'All SLOs are healthy. Click to view details.',
                  })}
                >
                  <EuiBadge
                    data-test-subj="serviceInventorySloHealthyBadge"
                    color="success"
                    onClick={() => onSloHealthyClick?.(serviceName)}
                    onClickAriaLabel={i18n.translate(
                      'xpack.apm.servicesTable.sloHealthyAriaLabel',
                      {
                        defaultMessage: 'View healthy SLOs for {serviceName}',
                        values: { serviceName },
                      }
                    )}
                  >
                    {i18n.translate('xpack.apm.servicesTable.sloHealthy', {
                      defaultMessage: 'Healthy',
                    })}
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
  const { core } = useApmPluginContext();
  const { slo } = useKibana<ApmPluginStartDeps>().services;
  const { link } = useApmRouter();
  const showTransactionTypeColumn = items.some(
    ({ transactionType }) => transactionType && !isDefaultTransactionType(transactionType)
  );
  const { query } = useApmParams('/services');
  const { kuery, environment } = query;
  const { fallbackToTransactions } = useFallbackToTransactionsFetcher({
    kuery,
  });

  // Alert rule flyout state
  const [alertFlyoutState, setAlertFlyoutState] = useState<{
    isOpen: boolean;
    ruleType: ApmRuleType | null;
    serviceName: string | undefined;
  }>({
    isOpen: false,
    ruleType: null,
    serviceName: undefined,
  });

  // SLO flyout state
  type SloIndicatorType = 'sli.apm.transactionDuration' | 'sli.apm.transactionErrorRate';
  const [sloFlyoutState, setSloFlyoutState] = useState<{
    isOpen: boolean;
    indicatorType: SloIndicatorType | null;
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

  const openSloFlyout = useCallback((indicatorType: SloIndicatorType, serviceName: string) => {
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

  const handleSloHealthyClick = useCallback((serviceName: string) => {
    console.log(`SLO Healthy clicked for service: ${serviceName}`);
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
                environment: environment === 'ENVIRONMENT_ALL' ? '*' : environment,
              },
            },
          },
          onClose: closeSloFlyout,
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
      onSloHealthyClick: handleSloHealthyClick,
      basePath: core.http.basePath,
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
    handleSloHealthyClick,
    core.http.basePath,
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

  const serviceActions: TableActions<ServiceListItem> = useMemo(
    () => [
      {
        groupLabel: i18n.translate('xpack.apm.servicesTable.actions.alertsGroupLabel', {
          defaultMessage: 'Alerts',
        }),
        actions: [
          {
            name: i18n.translate('xpack.apm.servicesTable.actions.createThresholdRule', {
              defaultMessage: 'Create threshold rule',
            }),
            items: [
              {
                name: i18n.translate('xpack.apm.servicesTable.actions.createLatencyRule', {
                  defaultMessage: 'Latency',
                }),
                onClick: (item) => {
                  openAlertFlyout(ApmRuleType.TransactionDuration, item.serviceName);
                },
              },
              {
                name: i18n.translate(
                  'xpack.apm.servicesTable.actions.createFailedTransactionRateRule',
                  {
                    defaultMessage: 'Failed transaction rate',
                  }
                ),
                onClick: (item) => {
                  openAlertFlyout(ApmRuleType.TransactionErrorRate, item.serviceName);
                },
              },
            ],
          },
          {
            name: i18n.translate('xpack.apm.servicesTable.actions.createAnomalyRule', {
              defaultMessage: 'Create anomaly rule',
            }),
            onClick: (item) => {
              openAlertFlyout(ApmRuleType.Anomaly, item.serviceName);
            },
          },
          {
            name: i18n.translate('xpack.apm.servicesTable.actions.createErrorCountRule', {
              defaultMessage: 'Create error count rule',
            }),
            onClick: (item) => {
              openAlertFlyout(ApmRuleType.ErrorCount, item.serviceName);
            },
          },
          {
            name: i18n.translate('xpack.apm.servicesTable.actions.manageRules', {
              defaultMessage: 'Manage rules',
            }),
            icon: 'tableOfContents',
            onClick: (item) => {
              const { basePath } = core.http;
              const rulesUrl = basePath.prepend(
                `/app/observability/alerts/rules?_a=${rison.encode({
                  search: `service.name:${item.serviceName}`,
                  type: [
                    'apm.anomaly',
                    'apm.error_rate',
                    'apm.transaction_error_rate',
                    'apm.transaction_duration',
                  ],
                })}`
              );
              window.location.href = rulesUrl;
            },
          },
        ],
      },
      {
        groupLabel: i18n.translate('xpack.apm.servicesTable.actions.slosGroupLabel', {
          defaultMessage: 'SLOs',
        }),
        actions: [
          {
            name: i18n.translate('xpack.apm.servicesTable.actions.createLatencySlo', {
              defaultMessage: 'Create APM latency SLO',
            }),
            onClick: (item) => {
              openSloFlyout('sli.apm.transactionDuration', item.serviceName);
            },
          },
          {
            name: i18n.translate('xpack.apm.servicesTable.actions.createAvailabilitySlo', {
              defaultMessage: 'Create APM availability SLO',
            }),
            onClick: (item) => {
              openSloFlyout('sli.apm.transactionErrorRate', item.serviceName);
            },
          },
          {
            name: i18n.translate('xpack.apm.servicesTable.actions.manageSlos', {
              defaultMessage: 'Manage SLOs',
            }),
            icon: 'tableOfContents',
            onClick: (item) => {
              const { basePath } = core.http;
              const slosUrl = basePath.prepend(
                `/app/slos?search=${rison.encode({
                  filters: [
                    {
                      meta: {
                        alias: null,
                        disabled: false,
                        key: 'service.name',
                        negate: false,
                        params: { query: item.serviceName },
                        type: 'phrase',
                      },
                      query: {
                        match_phrase: { 'service.name': item.serviceName },
                      },
                    },
                    {
                      meta: {
                        alias: null,
                        disabled: false,
                        key: 'slo.indicator.type',
                        negate: false,
                        params: ['sli.apm.transactionDuration', 'sli.apm.transactionErrorRate'],
                        type: 'phrases',
                      },
                      query: {
                        bool: {
                          minimum_should_match: 1,
                          should: [
                            {
                              match_phrase: {
                                'slo.indicator.type': 'sli.apm.transactionDuration',
                              },
                            },
                            {
                              match_phrase: {
                                'slo.indicator.type': 'sli.apm.transactionErrorRate',
                              },
                            },
                          ],
                        },
                      },
                    },
                  ],
                })}`
              );
              window.location.href = slosUrl;
            },
          },
        ],
      },
    ],
    [openAlertFlyout, openSloFlyout, core.http]
  );

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
          isActionsDisabled={(item) => item.serviceName === OTHER_SERVICE_NAME}
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
    </EuiFlexGroup>
  );
}
