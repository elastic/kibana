/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiBasicTable, EuiText, EuiPanel } from '@elastic/eui';

import * as i18n from './translations';
import { buildColumns } from './table_helpers';
import { TableProps, TableItemCallback } from './types';

export interface ValueListsTableProps {
  items: TableProps['items'];
  loading: boolean;
  onChange: TableProps['onChange'];
  onExport: TableItemCallback;
  onDelete: TableItemCallback;
  pagination: Exclude<TableProps['pagination'], undefined>;
}

export const ValueListsTableComponent: React.FC<ValueListsTableProps> = ({
  items,
  loading,
  onChange,
  onExport,
  onDelete,
  pagination,
}) => {
  const columns = buildColumns(onExport, onDelete);
  return (
    <EuiPanel>
      <EuiText size="s">
        <h2>{i18n.TABLE_TITLE}</h2>
      </EuiText>
      <EuiBasicTable
        columns={columns}
        items={items}
        loading={loading}
        onChange={onChange}
        pagination={pagination}
      />
    </EuiPanel>
  );
};

ValueListsTableComponent.displayName = 'ValueListsTableComponent';

export const ValueListsTable = React.memo(ValueListsTableComponent);

ValueListsTable.displayName = 'ValueListsTable';
