/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, RIGHT_ALIGNMENT } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TypeOf } from '@kbn/typed-react-router-config';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import {
  asDecimalOrInteger,
  asMillisecondDuration,
  asPercent,
  asTransactionRate,
} from '../../../../../../common/utils/formatters';
import { Breakpoints } from '../../../../../hooks/use_breakpoints';
import { unit } from '../../../../../utils/style';
import { ApmRoutes } from '../../../../routing/apm_route_config';
import {
  getTimeSeriesColor,
  ChartType,
} from '../../../../shared/charts/helper/get_timeseries_color';
import {
  getMetricsFormula,
  ChartMetricType,
} from '../../../../shared/charts/helper/get_metrics_formulas';
import { EnvironmentBadge } from '../../../../shared/environment_badge';
import { ServiceLink } from '../../../../shared/links/apm/service_link';
import { ListMetric } from '../../../../shared/list_metric';
import { ITableColumn } from '../../../../shared/managed_table';
import { NotAvailableApmMetrics } from '../../../../shared/not_available_popover/not_available_apm_metrics';
import { TruncateWithTooltip } from '../../../../shared/truncate_with_tooltip';
import { ServiceInventoryFieldName } from './multi_signal_services_table';
import { EntityServiceListItem, SignalTypes } from '../../../../../../common/entities/types';
import { isApmSignal, isLogsSignal } from '../../../../../utils/get_signal_type';
import { ColumnHeader } from './column_header';
import { APIReturnType } from '../../../../../services/rest/create_call_apm_api';
import { NotAvailableLogsMetrics } from '../../../../shared/not_available_popover/not_available_log_metrics';

type ServicesDetailedStatisticsAPIResponse =
  APIReturnType<'POST /internal/apm/entities/services/detailed_statistics'>;

export function getServiceColumns({
  query,
  breakpoints,
  timeseriesDataLoading,
  timeseriesData,
}: {
  query: TypeOf<ApmRoutes, '/services'>['query'];
  breakpoints: Breakpoints;
  timeseriesDataLoading: boolean;
  timeseriesData?: ServicesDetailedStatisticsAPIResponse;
}): Array<ITableColumn<EntityServiceListItem>> {
  const { isSmall, isLarge } = breakpoints;
  const showWhenSmallOrGreaterThanLarge = isSmall || !isLarge;
  return [
    {
      field: ServiceInventoryFieldName.ServiceName,
      name: i18n.translate('xpack.apm.multiSignal.servicesTable.nameColumnLabel', {
        defaultMessage: 'Name',
      }),
      sortable: true,
      render: (_, { serviceName, agentName, signalTypes }) => (
        <TruncateWithTooltip
          data-test-subj="apmServiceListAppLink"
          text={serviceName}
          content={
            <EuiFlexGroup gutterSize="s" justifyContent="flexStart">
              <EuiFlexItem grow={false}>
                <ServiceLink
                  signalTypes={signalTypes}
                  serviceName={serviceName}
                  agentName={agentName}
                  query={query}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          }
        />
      ),
    },
    {
      field: ServiceInventoryFieldName.Environments,
      name: i18n.translate('xpack.apm.multiSignal.servicesTable.environmentColumnLabel', {
        defaultMessage: 'Environment',
      }),
      sortable: true,
      width: `${unit * 9}px`,
      dataType: 'number',
      render: (_, { environments, signalTypes }) => (
        <EnvironmentBadge
          environments={environments}
          isMetricsSignalType={signalTypes.includes(SignalTypes.METRICS)}
        />
      ),
      align: RIGHT_ALIGNMENT,
    },
    {
      field: ServiceInventoryFieldName.Latency,
      name: i18n.translate('xpack.apm.multiSignal.servicesTable.latencyAvgColumnLabel', {
        defaultMessage: 'Latency (avg.)',
      }),
      sortable: true,
      dataType: 'number',
      align: RIGHT_ALIGNMENT,
      render: (_, { metrics, serviceName, signalTypes }) => {
        const { currentPeriodColor } = getTimeSeriesColor(ChartType.LATENCY_AVG);

        return !isApmSignal(signalTypes) ? (
          <NotAvailableApmMetrics />
        ) : (
          <ListMetric
            isLoading={timeseriesDataLoading}
            series={timeseriesData?.currentPeriod?.[serviceName]?.latency}
            color={currentPeriodColor}
            valueLabel={asMillisecondDuration(metrics.latency)}
            hideSeries={!showWhenSmallOrGreaterThanLarge}
          />
        );
      },
    },
    {
      field: ServiceInventoryFieldName.Throughput,
      name: i18n.translate('xpack.apm.multiSignal.servicesTable.throughputColumnLabel', {
        defaultMessage: 'Throughput',
      }),
      sortable: true,
      dataType: 'number',
      align: RIGHT_ALIGNMENT,
      render: (_, { metrics, serviceName, signalTypes }) => {
        const { currentPeriodColor } = getTimeSeriesColor(ChartType.THROUGHPUT);

        return !isApmSignal(signalTypes) ? (
          <NotAvailableApmMetrics />
        ) : (
          <ListMetric
            color={currentPeriodColor}
            valueLabel={asTransactionRate(metrics.throughput)}
            isLoading={timeseriesDataLoading}
            series={timeseriesData?.currentPeriod?.[serviceName]?.throughput}
            hideSeries={!showWhenSmallOrGreaterThanLarge}
          />
        );
      },
    },
    {
      field: ServiceInventoryFieldName.FailedTransactionRate,
      name: i18n.translate('xpack.apm.multiSignal.servicesTable.transactionErrorRate', {
        defaultMessage: 'Failed transaction rate',
      }),
      sortable: true,
      dataType: 'number',
      align: RIGHT_ALIGNMENT,
      render: (_, { metrics, serviceName, signalTypes }) => {
        const { currentPeriodColor } = getTimeSeriesColor(ChartType.FAILED_TRANSACTION_RATE);

        return !isApmSignal(signalTypes) ? (
          <NotAvailableApmMetrics />
        ) : (
          <ListMetric
            color={currentPeriodColor}
            valueLabel={asPercent(metrics.failedTransactionRate, 1)}
            isLoading={timeseriesDataLoading}
            series={timeseriesData?.currentPeriod?.[serviceName]?.failedTransactionRate}
            hideSeries={!showWhenSmallOrGreaterThanLarge}
          />
        );
      },
    },
    {
      field: ServiceInventoryFieldName.logRate,
      name: (
        <ColumnHeader
          label={i18n.translate('xpack.apm.multiSignal.servicesTable.logRate', {
            defaultMessage: 'Log rate (per min.)',
          })}
          formula={getMetricsFormula(ChartMetricType.LOG_RATE)}
          toolTip={
            <FormattedMessage
              defaultMessage="Rate of logs per minute observed for given {serviceName}."
              id="xpack.apm.multiSignal.servicesTable.logRate.tooltip.description"
              values={{
                serviceName: (
                  <code
                    css={css`
                      word-break: break-word;
                    `}
                  >
                    {i18n.translate(
                      'xpack.apm.multiSignal.servicesTable.logRate.tooltip.serviceNameLabel',
                      {
                        defaultMessage: 'service.name',
                      }
                    )}
                  </code>
                ),
              }}
            />
          }
        />
      ),
      sortable: true,
      dataType: 'number',
      align: RIGHT_ALIGNMENT,
      render: (_, { metrics, serviceName, signalTypes, hasLogMetrics }) => {
        if (isLogsSignal(signalTypes) && !hasLogMetrics) {
          return <NotAvailableLogsMetrics />;
        }

        const { currentPeriodColor } = getTimeSeriesColor(ChartType.LOG_RATE);
        return (
          <ListMetric
            isLoading={timeseriesDataLoading}
            color={currentPeriodColor}
            series={timeseriesData?.currentPeriod?.[serviceName]?.logRate}
            valueLabel={asDecimalOrInteger(metrics.logRate)}
            hideSeries={!showWhenSmallOrGreaterThanLarge}
          />
        );
      },
    },
    {
      field: ServiceInventoryFieldName.LogErrorRate,
      name: (
        <ColumnHeader
          label={i18n.translate('xpack.apm.multiSignal.servicesTable.logErrorRate', {
            defaultMessage: 'Log error %',
          })}
          formula={getMetricsFormula(ChartMetricType.LOG_ERROR_RATE)}
          toolTip={
            <FormattedMessage
              defaultMessage="% of logs where error detected for given {serviceName}."
              id="xpack.apm.multiSignal.servicesTable.logErrorRate.tooltip.description"
              values={{
                serviceName: (
                  <code
                    css={css`
                      word-break: break-word;
                    `}
                  >
                    {i18n.translate(
                      'xpack.apm.multiSignal.servicesTable.logErrorRate.tooltip.serviceNameLabel',
                      {
                        defaultMessage: 'service.name',
                      }
                    )}
                  </code>
                ),
              }}
            />
          }
        />
      ),
      sortable: true,
      dataType: 'number',
      align: RIGHT_ALIGNMENT,
      render: (_, { metrics, serviceName, signalTypes, hasLogMetrics }) => {
        if (isLogsSignal(signalTypes) && !hasLogMetrics) {
          return <NotAvailableLogsMetrics />;
        }

        const { currentPeriodColor } = getTimeSeriesColor(ChartType.LOG_ERROR_RATE);

        return (
          <ListMetric
            isLoading={timeseriesDataLoading}
            color={currentPeriodColor}
            series={timeseriesData?.currentPeriod?.[serviceName]?.logErrorRate}
            valueLabel={asPercent(metrics.logErrorRate, 1)}
            hideSeries={!showWhenSmallOrGreaterThanLarge}
          />
        );
      },
    },
  ];
}
