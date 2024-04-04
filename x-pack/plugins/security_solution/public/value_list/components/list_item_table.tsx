/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiBasicTable } from '@elastic/eui';
import React from 'react';
import type { ListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { InlineEditListItemValue } from './inline_edit_list_item_value';
import { DeleteListItem } from './delete_list_item';
import { FormattedDate } from '../../common/components/formatted_date';
import type { ListItemTableProps, ListItemTableColumns } from '../types';
import {
  COLUMN_VALUE,
  COLUMN_UPDATED_AT,
  COLUMN_UPDATED_BY,
  COLUMN_ACTIONS,
  FAILED_TO_FETCH_LIST_ITEM,
  DELETE_LIST_ITEM,
  DELETE_LIST_ITEM_DESCRIPTION,
} from '../translations';

export const ListItemTable = ({
  canWriteIndex,
  items,
  pagination,
  sorting,
  loading,
  onChange,
  isError,
  list,
}: ListItemTableProps) => {
  const columns: ListItemTableColumns = [
    {
      field: 'value',
      name: COLUMN_VALUE,
      render: (value, item) =>
        canWriteIndex ? <InlineEditListItemValue listItem={item} key={value} /> : value,
      sortable: list.type !== 'text',
    },
    {
      field: 'updated_at',
      name: COLUMN_UPDATED_AT,
      render: (value: ListItemSchema['updated_at']) => (
        <FormattedDate value={value} fieldName="updated_at" />
      ),
      width: '25%',
      sortable: true,
    },
    {
      field: 'updated_by',
      name: COLUMN_UPDATED_BY,
      width: '15%',
    },
  ];
  if (canWriteIndex) {
    columns.push({
      name: COLUMN_ACTIONS,
      actions: [
        {
          name: DELETE_LIST_ITEM,
          description: DELETE_LIST_ITEM_DESCRIPTION,
          isPrimary: true,
          render: (item: ListItemSchema) => <DeleteListItem id={item.id} value={item.value} />,
        },
      ],
      width: '10%',
    });
  }

  return (
    <EuiBasicTable
      data-test-subj="value-list-items-modal-table"
      items={items}
      columns={columns}
      pagination={pagination}
      sorting={sorting}
      error={isError ? FAILED_TO_FETCH_LIST_ITEM : undefined}
      loading={loading}
      onChange={onChange}
    />
  );
};
