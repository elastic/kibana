/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiBasicTable, EuiBasicTableProps, EuiText, EuiPanel } from '@elastic/eui';

import { ListSchema } from '../../../../../lists/common/schemas/response';
import * as i18n from './translations';

type TableProps = EuiBasicTableProps<ListSchema>;
type ActionCallback = (item: ListSchema) => void;

export interface ValueListsTableProps {
  lists: TableProps['items'];
  loading: boolean;
  onChange: TableProps['onChange'];
  onExport: ActionCallback;
  onDelete: ActionCallback;
  pagination: Exclude<TableProps['pagination'], undefined>;
}

const buildColumns = (
  onExport: ActionCallback,
  onDelete: ActionCallback
): TableProps['columns'] => [
  {
    field: 'name',
    name: i18n.COLUMN_FILE_NAME,
    truncateText: false,
  },
  {
    field: 'created_at',
    name: i18n.COLUMN_UPLOAD_DATE,
    truncateText: false,
  },
  {
    field: 'created_by',
    name: i18n.COLUMN_CREATED_BY,
    truncateText: false,
  },
  {
    name: i18n.COLUMN_ACTIONS,
    actions: [
      {
        name: i18n.ACTION_EXPORT_NAME,
        description: i18n.ACTION_EXPORT_DESCRIPTION,
        icon: 'exportAction',
        type: 'icon',
        onClick: onExport,
        'data-test-subj': 'action-export-value-list',
      },
      {
        name: i18n.ACTION_DELETE_NAME,
        description: i18n.ACTION_DELETE_DESCRIPTION,
        icon: 'trash',
        type: 'icon',
        onClick: onDelete,
        'data-test-subj': 'action-delete-value-list',
      },
    ],
  },
];

export const ValueListsTableComponent: React.FC<ValueListsTableProps> = ({
  lists,
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
        items={lists}
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
