/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RIGHT_ALIGNMENT } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TypeOf } from '@kbn/typed-react-router-config';
import React from 'react';
import { AssetServiceListItem } from '../../../../../../common/assets/types';

import { Breakpoints } from '../../../../../hooks/use_breakpoints';
import { unit } from '../../../../../utils/style';
import { ApmRoutes } from '../../../../routing/apm_route_config';
import { EnvironmentBadge } from '../../../../shared/environment_badge';
import { ServiceLink } from '../../../../shared/links/apm/service_link';
import { ITableColumn, ManagedTable, SortFunction } from '../../../../shared/managed_table';

export enum ServiceInventoryFieldName {
  ServiceName = 'service.name',
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
}): Array<ITableColumn<AssetServiceListItem>> {
  const { isSmall, isLarge, isXl } = breakpoints;
  const showWhenSmallOrGreaterThanLarge = isSmall || !isLarge;
  const showWhenSmallOrGreaterThanXL = isSmall || !isXl;

  return [
    {
      field: ServiceInventoryFieldName.ServiceName,
      name: i18n.translate('xpack.apm.multiSignal.servicesTable.nameColumnLabel', {
        defaultMessage: 'Name',
      }),
      sortable: true,
      render: (_, { service }) => <ServiceLink query={{ ...query }} serviceName={service.name} />,
    },
    {
      field: ServiceInventoryFieldName.Latency,
      name: i18n.translate('xpack.apm.multiSignal.servicesTable.latencyAvgColumnLabel', {
        defaultMessage: 'Latency (avg.)',
      }),
      sortable: true,
      dataType: 'number',

      align: RIGHT_ALIGNMENT,
    },
    {
      field: ServiceInventoryFieldName.Throughput,
      name: i18n.translate('xpack.apm.multiSignal.servicesTable.throughputColumnLabel', {
        defaultMessage: 'Throughput',
      }),
      sortable: true,
      dataType: 'number',
      align: RIGHT_ALIGNMENT,
    },
    {
      field: ServiceInventoryFieldName.TransactionErrorRate,
      name: i18n.translate('xpack.apm.multiSignal.servicesTable.transactionErrorRate', {
        defaultMessage: 'Failed transaction rate',
      }),
      sortable: true,
      dataType: 'number',
      align: RIGHT_ALIGNMENT,
    },
    {
      field: ServiceInventoryFieldName.LogRatePerMinute,
      name: i18n.translate('xpack.apm.multiSignal.servicesTable.logRatePerMinute', {
        defaultMessage: 'Log rate (per minute)',
      }),
      sortable: true,
      dataType: 'number',
      align: RIGHT_ALIGNMENT,
    },
    {
      field: ServiceInventoryFieldName.LogErrorRate,
      name: i18n.translate('xpack.apm.multiSignal.servicesTable.logErrorRate', {
        defaultMessage: 'Log error rate',
      }),
      sortable: true,
      dataType: 'number',
      align: RIGHT_ALIGNMENT,
    },
  ];
}
