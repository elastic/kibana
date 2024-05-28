/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { UnmanagedTable } from '../../../shared/managed_table/unmanaged_table';
import { InteractiveServiceListItem } from './types';

export function UnmanagedServiceList({
  columns,
  items,
  isLoading,
  isError,
  sorting,
  onChange,
  pagination,
}: {
  columns: Array<EuiBasicTableColumn<InteractiveServiceListItem>>;
  items: InteractiveServiceListItem[];
  isLoading: boolean;
  isError: boolean;
  sorting: React.ComponentProps<typeof UnmanagedTable<InteractiveServiceListItem>>['sorting'];
  onChange: React.ComponentProps<typeof UnmanagedTable<InteractiveServiceListItem>>['onChange'];
  pagination: React.ComponentProps<typeof UnmanagedTable<InteractiveServiceListItem>>['pagination'];
}) {
  return (
    <UnmanagedTable<InteractiveServiceListItem>
      columns={columns}
      items={items}
      noItemsMessage={i18n.translate('xpack.apm.servicesTable.notFoundLabel', {
        defaultMessage: 'No services found',
      })}
      onChange={onChange}
      pagination={pagination}
      sorting={sorting}
      isLoading={isLoading}
      isError={isError}
    />
  );
}
