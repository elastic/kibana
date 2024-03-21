/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useCallback } from 'react';
import { css } from '@emotion/css';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiBasicTable,
  EuiInlineEditText,
  EuiFlexItem,
  EuiFlexGroup,
  useEuiPaddingSize,
} from '@elastic/eui';
import { useFindListItems } from '../../hooks/use_find_list_items';
import { useDeleteListItemMutation } from '../../hooks/use_delete_list_item';
import { usePatchListItemMutation } from '../../hooks/use_patch_list_item';
import { FormattedDate } from '../../../common/components/formatted_date';
import { useKibana } from '../../../common/lib/kibana';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { AddListItemPopover } from '../add_list_item_popover';

const toastOptions = {
  toastLifeTimeMs: 5000,
};

const tableStyle = css`
  overflow: scroll;
`;

const InlineEditListItemValue = ({ listItem }) => {
  const [value, setValue] = useState(listItem.value);
  const { addSuccess, addError } = useAppToasts();
  const patchListItemMutation = usePatchListItemMutation({
    onSuccess: () => {
      addSuccess('Succesfully updated list item', toastOptions);
    },
    onError: (error) => {
      addError('Failed to update list item', toastOptions);
      setValue(listItem.value);
    },
  });
  console.log(patchListItemMutation.isLoading);
  const onChange = useCallback((e) => {
    setValue(e.target.value);
  }, []);
  const onCancel = useCallback(() => {
    setValue(listItem.item);
  }, []);
  const onSave = useCallback(async (newValue) => {
    await patchListItemMutation.mutateAsync({
      id: listItem.id,
      value: newValue,
      _version: listItem._version,
    });
    return true;
  }, []);

  return (
    <EuiInlineEditText
      size={'s'}
      inputAriaLabel="Edit text inline"
      value={value}
      onChange={onChange}
      onSave={onSave}
      onCancel={onCancel}
      isLoading={patchListItemMutation.isLoading}
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
  const [sortField, setSortField] = useState('updated_at');
  const [sortOrder, setSortOrder] = useState('desc');

  const modalStyle = css`
    overflow: hidden;
    padding: ${useEuiPaddingSize('m')};
  `;
  const { data, isLoading, isError } = useFindListItems({
    listId,
    pageIndex: pageIndex + 1,
    pageSize,
    sortField,
    sortOrder,
    filter,
  });
  const { addSuccess } = useAppToasts();
  const deleteListItemMutation = useDeleteListItemMutation({
    onSuccess: () => {
      addSuccess('Succesfully deleted list item', toastOptions);
    },
  });
  const {
    unifiedSearch: {
      ui: { SearchBar },
    },
  } = useKibana().services;

  const actions = [
    // {
    //   name: 'Edit',
    //   isPrimary: true,
    //   // available: ({ online }) => !online,
    //   // enabled: ({ online }) => !!online,
    //   description: 'Edit',
    //   icon: 'pencil',
    //   type: 'icon',
    //   onClick: () => {},
    // },
    {
      name: 'Delete',
      icon: 'trash',
      color: 'danger',
      type: 'icon',
      onClick: (item) => deleteListItemMutation.mutate({ id: item.id }),
      isPrimary: true,
    },
  ];

  const columns: Array<EuiBasicTableColumn<any>> = [
    {
      field: 'value',
      name: 'Value',
      render: (value, item) => <InlineEditListItemValue listItem={item} key={value} />,
    },
    {
      field: 'updated_at',
      name: 'Updated At',
      render: (value) => <FormattedDate value={value} fieldName="updated_at" />,
      width: '25%',
    },
    {
      field: 'updated_by',
      name: 'Updated By',
      width: '15%',
    },
    {
      name: 'Actions',
      actions,
      width: '10%',
    },
  ];
  console.log(data, isLoading, isError);

  const sorting: EuiTableSortingType<User> = {
    sort: {
      field: sortField,
      direction: sortOrder,
    },
    enableAllColumns: true,
  };

  const pagination = {
    pageIndex,
    pageSize,
    totalItemCount: data?.total,
    pageSizeOptions: [5, 10, 25],
    // showPerPageOptions,
  };

  const onQuerySubmit = useCallback((payload: { query }) => {
    try {
      console.log(payload);
      setFilter(payload.query.query);
    } catch (e) {}
  }, []);

  return (
    <EuiModal maxWidth={false} css={() => ({ minHeight: '85vh' })} onClose={onCloseModal}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>Value list</EuiModalHeaderTitle>
        <AddListItemPopover listId={listId} />
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
            //   rowHeader="firstName"
            columns={columns}
            //   rowProps={getRowProps}
            //   cellProps={getCellProps}
            pagination={pagination}
            sorting={sorting}
            onChange={({ page, sort }) => {
              if (page) {
                setPageIndex(page.index);
                setPageSize(page.size);
              }
              if (sort) {
                setSortField(sort.field);
                setSortOrder(sort.direction);
              }
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiModal>
  );
};
