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
import { EnvironmentBadge } from '../../../../shared/environment_badge';
import { ServiceLink } from '../../../../shared/links/apm/service_link';
import { ListMetric } from '../../../../shared/list_metric';
import { ITableColumn } from '../../../../shared/managed_table';
import { NotAvailableApmMetrics } from '../../../../shared/not_available_apm_metrics';
import { TruncateWithTooltip } from '../../../../shared/truncate_with_tooltip';
import { ServiceInventoryFieldName } from './multi_signal_services_table';
import { EntityServiceListItem, SignalTypes } from '../../../../../../common/entities/types';
export function getServiceColumns({
  query,
  breakpoints,
  link,
}: {
  query: TypeOf<ApmRoutes, '/services'>['query'];
  breakpoints: Breakpoints;
  link: any;
}): Array<ITableColumn<EntityServiceListItem>> {
  return [
    {
      field: ServiceInventoryFieldName.ServiceName,
      name: i18n.translate('xpack.apm.multiSignal.servicesTable.nameColumnLabel', {
        defaultMessage: 'Name',
      }),
      sortable: true,
      render: (_, { serviceName, agentName }) => (
        <TruncateWithTooltip
          data-test-subj="apmServiceListAppLink"
          text={serviceName}
          content={
            <EuiFlexGroup gutterSize="s" justifyContent="flexStart">
              <EuiFlexItem grow={false}>
                <ServiceLink serviceName={serviceName} agentName={agentName} query={query} />
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
      render: (_, { metrics, signalTypes }) => {
        const { currentPeriodColor } = getTimeSeriesColor(ChartType.LATENCY_AVG);

        return !signalTypes.includes(SignalTypes.METRICS) ? (
          <NotAvailableApmMetrics />
        ) : (
          <ListMetric
            isLoading={false}
            color={currentPeriodColor}
            hideSeries
            valueLabel={asMillisecondDuration(metrics.latency)}
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
      render: (_, { metrics, signalTypes }) => {
        const { currentPeriodColor } = getTimeSeriesColor(ChartType.THROUGHPUT);

        return !signalTypes.includes(SignalTypes.METRICS) ? (
          <NotAvailableApmMetrics />
        ) : (
          <ListMetric
            isLoading={false}
            color={currentPeriodColor}
            hideSeries
            valueLabel={asTransactionRate(metrics.throughput)}
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
      render: (_, { metrics, signalTypes }) => {
        const { currentPeriodColor } = getTimeSeriesColor(ChartType.FAILED_TRANSACTION_RATE);

        return !signalTypes.includes(SignalTypes.METRICS) ? (
          <NotAvailableApmMetrics />
        ) : (
          <ListMetric
            isLoading={false}
            color={currentPeriodColor}
            hideSeries
            valueLabel={asPercent(metrics.failedTransactionRate, 1)}
          />
        );
      },
    },
    {
      field: ServiceInventoryFieldName.LogRatePerMinute,
      name: i18n.translate('xpack.apm.multiSignal.servicesTable.logRatePerMinute', {
        defaultMessage: 'Log rate (per min.)',
      }),
      sortable: true,
      dataType: 'number',
      align: RIGHT_ALIGNMENT,
      render: (_, { metrics }) => {
        const { currentPeriodColor } = getTimeSeriesColor(ChartType.LOG_RATE);

        return (
          <ListMetric
            isLoading={false}
            color={currentPeriodColor}
            hideSeries
            valueLabel={asDecimalOrInteger(metrics.logRatePerMinute)}
          />
        );
      },
    },
    {
      field: ServiceInventoryFieldName.LogErrorRate,
      name: i18n.translate('xpack.apm.multiSignal.servicesTable.logErrorRate', {
        defaultMessage: 'Log error rate',
      }),
      sortable: true,
      dataType: 'number',
      align: RIGHT_ALIGNMENT,
      render: (_, { metrics }) => {
        const { currentPeriodColor } = getTimeSeriesColor(ChartType.LOG_ERROR_RATE);

        return (
          <ListMetric
            isLoading={false}
            color={currentPeriodColor}
            hideSeries
            valueLabel={asPercent(metrics.logErrorRate, 1)}
          />
        );
      },
    },
  ];
}
