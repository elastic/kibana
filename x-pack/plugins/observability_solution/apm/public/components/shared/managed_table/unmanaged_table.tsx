/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  CriteriaWithPagination,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiEmptyPrompt,
  EuiTableSortingType,
  Pagination,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

function NoItemsMessage({ content }: { content: React.ReactNode }) {
  return <EuiEmptyPrompt title={<div>{content}</div>} titleSize="s" />;
}

export function UnmanagedTable<T extends Record<string, any>>({
  columns,
  items,
  noItemsMessage,
  isLoading = false,
  isError,
  sorting,
  pagination,
  onChange,
}: {
  columns: Array<EuiBasicTableColumn<T>>;
  items: T[];
  noItemsMessage: React.ReactNode;
  isLoading?: boolean;
  isError?: boolean;
  sorting?: EuiTableSortingType<T>;
  pagination: Pagination;
  onChange: (criteria: CriteriaWithPagination<T>) => void;
}) {
  return (
    <EuiBasicTable<T>
      columns={columns}
      items={items}
      error={
        isError
          ? i18n.translate('xpack.apm.managedTable.errorMessage', {
              defaultMessage: 'Failed to fetch',
            })
          : ''
      }
      noItemsMessage={
        isLoading ? (
          i18n.translate('xpack.apm.managedTable.loadingDescription', {
            defaultMessage: 'Loading…',
          })
        ) : (
          <NoItemsMessage content={noItemsMessage} />
        )
      }
      loading={isLoading}
      sorting={sorting}
      pagination={pagination}
      onChange={onChange}
    />
  );
}
