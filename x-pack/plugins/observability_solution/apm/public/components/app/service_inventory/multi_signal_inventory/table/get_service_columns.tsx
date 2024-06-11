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
import { AgentIcon } from '@kbn/custom-icons';
import { EntityServiceListItem } from '../../../../../../common/assets/types';
import {
  asMillisecondDuration,
  asPercent,
  asTransactionRate,
} from '../../../../../../common/utils/formatters';

import { Breakpoints } from '../../../../../hooks/use_breakpoints';
import { unit } from '../../../../../utils/style';
import { ApmRoutes } from '../../../../routing/apm_route_config';
import { EnvironmentBadge } from '../../../../shared/environment_badge';
import { ServiceLink } from '../../../../shared/links/apm/service_link';
import { ListMetric } from '../../../../shared/list_metric';
import { ITableColumn, ManagedTable, SortFunction } from '../../../../shared/managed_table';
import { TruncateWithTooltip } from '../../../../shared/truncate_with_tooltip';

export enum ServiceInventoryFieldName {
  ServiceName = 'identity.service.name',
  ServiceEnvironment = 'service.environment',
  Throughput = 'metrics.throughput',
  Latency = 'metrics.latency',
  TransactionErrorRate = 'metrics.transactionErrorRate',
  LogRatePerMinute = 'metrics.logRatePerMinute',
  LogErrorRate = 'metrics.logErrorRate',
}

export function getServiceColumns({
  query,
  breakpoints,
  link,
}: {
  query: TypeOf<ApmRoutes, '/services'>['query'];
  breakpoints: Breakpoints;
  link: any;
}): Array<ITableColumn<EntityServiceListItem>> {
  const { isSmall, isLarge, isXl } = breakpoints;

  return [
    {
      field: ServiceInventoryFieldName.ServiceName,
      name: i18n.translate('xpack.apm.multiSignal.servicesTable.nameColumnLabel', {
        defaultMessage: 'Name',
      }),
      sortable: true,
      render: (_, { name, agent }) => (
        <TruncateWithTooltip
          data-test-subj="apmServiceListAppLink"
          text={name}
          content={
            <EuiFlexGroup gutterSize="s" justifyContent="flexStart">
              <EuiFlexItem grow={false}>
                <AgentIcon agentName={agent.name[0]} size="l" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>{name}</EuiFlexItem>
            </EuiFlexGroup>
          }
        />
      ),
    },
    {
      field: ServiceInventoryFieldName.ServiceEnvironment,
      name: i18n.translate('xpack.apm.multiSignal.servicesTable.environmentColumnLabel', {
        defaultMessage: 'Environment',
      }),
      sortable: true,
      width: `${unit * 9}px`,
      dataType: 'number',
      render: (_, { environments }) => <EnvironmentBadge environments={environments ?? []} />,
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
      render: (_, { entity: { metric } }) => {
        return (
          <ListMetric
            isLoading={false}
            hideSeries={true}
            valueLabel={asMillisecondDuration(metric.latency)}
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
      render: (_, { entity: { metric } }) => {
        return (
          <ListMetric
            isLoading={false}
            hideSeries={true}
            valueLabel={asTransactionRate(metric.throughput)}
          />
        );
      },
    },
    {
      field: ServiceInventoryFieldName.TransactionErrorRate,
      name: i18n.translate('xpack.apm.multiSignal.servicesTable.transactionErrorRate', {
        defaultMessage: 'Failed transaction rate',
      }),
      sortable: true,
      dataType: 'number',
      align: RIGHT_ALIGNMENT,
      render: (_, { entity: { metric } }) => {
        return (
          <ListMetric
            isLoading={false}
            hideSeries={true}
            valueLabel={asPercent(metric.failedTransactionRate, 1)}
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
      render: (_, { entity: { metric } }) => {
        return (
          <ListMetric isLoading={false} hideSeries={true} valueLabel={metric.logRatePerMinute} />
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
      render: (_, { entity: { metric } }) => {
        return (
          <ListMetric
            isLoading={false}
            hideSeries={true}
            valueLabel={asPercent(metric.logErrorRate, 1)}
          />
        );
      },
    },
  ];
}
