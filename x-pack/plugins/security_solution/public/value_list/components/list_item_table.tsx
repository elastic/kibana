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
      name: 'Value',
      render: (value, item) =>
        canWriteIndex ? <InlineEditListItemValue listItem={item} key={value} /> : value,
      sortable: list.type !== 'text',
    },
    {
      field: 'updated_at',
      name: 'Updated At',
      render: (value: ListItemSchema['updated_at']) => (
        <FormattedDate value={value} fieldName="updated_at" />
      ),
      width: '25%',
      sortable: true,
    },
    {
      field: 'updated_by',
      name: 'Updated By',
      width: '15%',
    },
  ];
  if (canWriteIndex) {
    columns.push({
      name: 'Actions',
      actions: [
        {
          name: 'Delete',
          description: 'Delete this item',
          isPrimary: true,
          render: (item: ListItemSchema) => <DeleteListItem id={item.id} />,
        },
      ],
      width: '10%',
    });
  }

  return (
    <EuiBasicTable
      tableCaption="Demo of EuiBasicTable"
      items={items}
      columns={columns}
      pagination={pagination}
      sorting={sorting}
      error={
        isError
          ? 'Failed to load list items. You can change the search query or contact your administartor'
          : undefined
      }
      loading={loading}
      onChange={onChange}
    />
  );
};
