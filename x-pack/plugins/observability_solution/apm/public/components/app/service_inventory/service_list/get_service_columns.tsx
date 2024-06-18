/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiBadge,
  EuiBasicTableColumn,
  EuiIconTip,
  EuiToolTip,
  RIGHT_ALIGNMENT,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ServiceHealthStatus } from '../../../../../common/service_health_status';
import { ServiceInventoryFieldName } from '../../../../../common/service_inventory';
import {
  asMillisecondDuration,
  asPercent,
  asTransactionRate,
} from '../../../../../common/utils/formatters';
import { Breakpoints } from '../../../../hooks/use_breakpoints';
import { APIReturnType } from '../../../../services/rest/create_call_apm_api';
import { unit } from '../../../../utils/style';
import { ChartType, getTimeSeriesColor } from '../../../shared/charts/helper/get_timeseries_color';
import { EnvironmentBadge } from '../../../shared/environment_badge';
import { ListMetric } from '../../../shared/list_metric';
import { ColumnHeaderWithTooltip } from './column_header_with_tooltip';
import { HealthBadge } from './health_badge';
import type { InteractiveServiceListItem } from './types';

type ServicesDetailedStatisticsAPIResponse =
  APIReturnType<'POST /internal/apm/services/detailed_statistics'>;

export function getServiceColumns({
  showTransactionTypeColumn,
  comparisonDataLoading,
  comparisonData,
  breakpoints,
  showHealthStatusColumn,
  showAlertsColumn,
}: {
  showTransactionTypeColumn: boolean;
  showHealthStatusColumn: boolean;
  showAlertsColumn: boolean;
  comparisonDataLoading: boolean;
  breakpoints: Breakpoints;
  comparisonData?: ServicesDetailedStatisticsAPIResponse;
}): Array<EuiBasicTableColumn<InteractiveServiceListItem>> {
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
            render: (_, { serviceName, alertsCount, alerts }) => {
              if (!alertsCount) {
                return null;
              }

              const activeAlertsLabel = i18n.translate(
                'xpack.apm.home.servicesTable.tooltip.activeAlertsExplanation',
                {
                  defaultMessage: 'Active alerts',
                }
              );

              return (
                <EuiToolTip position="bottom" content={activeAlertsLabel}>
                  <EuiBadge
                    iconType="warning"
                    color="danger"
                    href={alerts.href}
                    {...((alerts.onClick
                      ? {
                          onClick: alerts.onClick!,
                          onClickAriaLabel: activeAlertsLabel,
                          iconOnClick: alerts.onClick!,
                          iconOnClickAriaLabel: activeAlertsLabel,
                        }
                      : // appease the TypeScript gods
                        {}) as {})}
                  >
                    {alertsCount}
                  </EuiBadge>
                </EuiToolTip>
              );
            },
          } as EuiBasicTableColumn<InteractiveServiceListItem>,
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
          } as EuiBasicTableColumn<InteractiveServiceListItem>,
        ]
      : []),
    {
      field: ServiceInventoryFieldName.ServiceName,
      name: i18n.translate('xpack.apm.servicesTable.nameColumnLabel', {
        defaultMessage: 'Name',
      }),
      sortable: true,
      render: (_, { serviceLink }) => serviceLink,
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
          } as EuiBasicTableColumn<InteractiveServiceListItem>,
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
