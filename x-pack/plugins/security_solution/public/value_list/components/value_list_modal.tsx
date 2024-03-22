/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useCallback } from 'react';
import { css } from '@emotion/css';
import type { EuiBasicTableColumn, EuiTableSortingType } from '@elastic/eui';
import type { Query } from '@kbn/es-query';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiBasicTable,
  EuiFlexItem,
  EuiFlexGroup,
  useEuiPaddingSize,
  EuiButtonIcon,
} from '@elastic/eui';
import type { ListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { useFindListItems, useDeleteListItemMutation } from '@kbn/securitysolution-list-hooks';
import { FormattedDate } from '../../common/components/formatted_date';
import { useKibana } from '../../common/lib/kibana';
import { useAppToasts } from '../../common/hooks/use_app_toasts';
import { AddListItemPopover } from './add_list_item_popover';
import { InlineEditListItemValue } from './inline_edit_list_item_value';
import { UploadListItem } from './upload_list_item';

const toastOptions = {
  toastLifeTimeMs: 5000,
};

const tableStyle = css`
  overflow: scroll;
`;

type SortFields = 'updated_at' | 'updated_by';

const DeleteListItemButton = ({ id }: { id: string }) => {
  const { addSuccess } = useAppToasts();
  const http = useKibana().services.http;
  const deleteListItemMutation = useDeleteListItemMutation({
    onSuccess: () => {
      addSuccess('Succesfully deleted list item', toastOptions);
    },
  });

  return (
    <EuiButtonIcon
      color={'danger'}
      onClick={() => deleteListItemMutation.mutate({ id, http })}
      iconType="trash"
      isLoading={deleteListItemMutation.isLoading}
    />
  );
};

export const ValueListModal = ({
  listId,
  onCloseModal,
}: {
  listId: string;
  onCloseModal: () => void;
}) => {
  const [filter, setFilter] = useState('');
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<SortFields>('updated_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const http = useKibana().services.http;

  const { data, isLoading, isError } = useFindListItems({
    listId,
    pageIndex: pageIndex + 1,
    pageSize,
    sortField,
    sortOrder,
    filter,
    http,
  });

  const modalStyle = css`
    overflow: hidden;
    padding: ${useEuiPaddingSize('m')};
  `;
  const {
    unifiedSearch: {
      ui: { SearchBar },
    },
  } = useKibana().services;

  const columns: Array<EuiBasicTableColumn<ListItemSchema>> = [
    {
      field: 'value',
      name: 'Value',
      render: (value, item) => <InlineEditListItemValue listItem={item} key={value} />,
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
    {
      name: 'Actions',
      actions: [
        {
          name: 'Delete',
          description: 'Delete this item',
          isPrimary: true,
          render: (item: ListItemSchema) => <DeleteListItemButton id={item.id} />,
        },
      ],
      width: '10%',
    },
  ];

  const sorting: EuiTableSortingType<Pick<ListItemSchema, SortFields>> = {
    sort: {
      field: sortField,
      direction: sortOrder,
    },
    enableAllColumns: false,
  };

  const pagination = {
    pageIndex,
    pageSize,
    totalItemCount: data?.total ?? 0,
    pageSizeOptions: [5, 10, 25],
  };

  const onQuerySubmit = useCallback((payload: { query?: Query }) => {
    if (payload.query === undefined) return;
    setFilter(payload.query.query.toString());
  }, []);

  return (
    <EuiModal maxWidth={false} css={() => ({ minHeight: '85vh' })} onClose={onCloseModal}>
      <EuiModalHeader>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiModalHeaderTitle>Value list</EuiModalHeaderTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={true}>
            <EuiFlexGroup justifyContent="flexEnd">
              <AddListItemPopover listId={listId} />
              <UploadListItem listId={listId} />
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalHeader>

      <EuiFlexGroup className={modalStyle} direction="column">
        <EuiFlexItem grow={false}>
          <SearchBar
            appName="siem"
            isLoading={isLoading}
            onQuerySubmit={onQuerySubmit}
            showFilterBar={false}
            showDatePicker={false}
            displayStyle={'inPage'}
            submitButtonStyle={'iconOnly'}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={true} className={tableStyle}>
          <EuiBasicTable
            tableCaption="Demo of EuiBasicTable"
            items={data?.data ?? []}
            columns={columns}
            pagination={pagination}
            sorting={sorting}
            onChange={({ page, sort }) => {
              if (page) {
                setPageIndex(page.index);
                setPageSize(page.size);
              }
              if (sort) {
                setSortField(sort.field as SortFields);
                setSortOrder(sort.direction);
              }
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiModal>
  );
};
