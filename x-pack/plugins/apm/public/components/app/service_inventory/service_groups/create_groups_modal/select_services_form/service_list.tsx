/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ValuesType } from 'utility-types';
import { APIReturnType } from '../../../../../../services/rest/createCallApmApi';
import { unit } from '../../../../../../utils/style';
import { EnvironmentBadge } from '../../../../../shared/environment_badge';
import {
  ITableColumn,
  ManagedTable,
} from '../../../../../shared/managed_table';
import { TruncateWithTooltip } from '../../../../../shared/truncate_with_tooltip';

type ServiceListAPIResponse = APIReturnType<'GET /internal/apm/services'>;
type Items = ServiceListAPIResponse['items'];
type ServiceListItem = ValuesType<Items>;

interface Props {
  items: Items;
  isLoading: boolean;
}

export function ServiceList({ items, isLoading }: Props) {
  const columns: Array<ITableColumn<ServiceListItem>> = [
    {
      field: 'serviceName',
      name: i18n.translate(
        'xpack.apm.serviceGroups.selectServicesList.nameColumnLabel',
        {
          defaultMessage: 'Name',
        }
      ),
      sortable: true,
      render: (_, { serviceName, agentName }) => (
        <TruncateWithTooltip
          data-test-subj="apmServiceListAppLink"
          text={serviceName}
        />
      ),
    },
    {
      field: 'environments',
      name: i18n.translate(
        'xpack.apm.serviceGroups.selectServicesList.environmentColumnLabel',
        { defaultMessage: 'Environments' }
      ),
      width: `${unit * 10}px`,
      sortable: true,
      render: (_, { environments }) => (
        <EnvironmentBadge environments={environments ?? []} />
      ),
    },
  ];

  return (
    <ManagedTable
      isLoading={isLoading}
      noItemsMessage={i18n.translate(
        'xpack.apm.serviceGroups.selectServicesList.notFoundLabel',
        {
          defaultMessage:
            'No services available within the last 24 hours. You can still create the group and services that match your query will be added.',
        }
      )}
      columns={columns}
      items={items}
      initialPageSize={5}
    />
  );
}
