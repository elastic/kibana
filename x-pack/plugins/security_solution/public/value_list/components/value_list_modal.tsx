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
  EuiText,
  EuiLoadingSpinner,
  EuiSpacer,
} from '@elastic/eui';
import type { ListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { useFindListItems, useGetListById } from '@kbn/securitysolution-list-hooks';
import { FormattedDate } from '../../common/components/formatted_date';
import { useKibana } from '../../common/lib/kibana';
import { AddListItemPopover } from './add_list_item_popover';
import { InlineEditListItemValue } from './inline_edit_list_item_value';
import { UploadListItem } from './upload_list_item';
import { DeleteListItem } from './delete_list_item';

const tableStyle = css`
  overflow: scroll;
`;
const info = css`
  margin-right: 8px;
`;
const infoLabel = css`
  margin-right: 4px;
`;

type SortFields = 'updated_at' | 'updated_by';

const Info = ({ label, value }: { value: React.ReactNode; label: string }) => (
  <EuiText size="xs" className={info}>
    <b className={infoLabel}>{label} </b> {value}
  </EuiText>
);

export const ValueListModal = ({
  listId,
  onCloseModal,
  canWriteIndex,
}: {
  listId: string;
  canWriteIndex: boolean;
  onCloseModal: () => void;
}) => {
  const [filter, setFilter] = useState('');
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<SortFields>('updated_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const http = useKibana().services.http;

  const {
    data: listItems,
    isLoading,
    isError,
  } = useFindListItems({
    listId,
    pageIndex: pageIndex + 1,
    pageSize,
    sortField,
    sortOrder,
    filter,
    http,
  });

  const { data: list, isLoading: isListLoading } = useGetListById({ http, id: listId });

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
      render: (value, item) =>
        canWriteIndex ? <InlineEditListItemValue listItem={item} key={value} /> : value,
      sortable: list?.type && list.type !== 'text',
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
    totalItemCount: listItems?.total ?? 0,
    pageSizeOptions: [5, 10, 25],
  };

  const onQuerySubmit = useCallback((payload: { query?: Query }) => {
    if (payload.query === undefined) return;
    setFilter(payload.query.query.toString());
  }, []);

  return (
    <EuiModal
      maxWidth={false}
      css={() => ({ minHeight: '90vh', marginTop: '5vh', maxWidth: '1400px' })}
      onClose={onCloseModal}
    >
      {isListLoading || !list ? (
        <EuiLoadingSpinner size="xxl" />
      ) : (
        <>
          <EuiModalHeader>
            <EuiFlexGroup justifyContent="spaceBetween" wrap>
              <EuiFlexItem grow={false}>
                <EuiModalHeaderTitle>{list.id}</EuiModalHeaderTitle>
                <EuiSpacer size="s" />
                {list.description && (
                  <>
                    <EuiText size="s">{list.description}</EuiText>
                    <EuiSpacer size="xs" />
                  </>
                )}
                <EuiFlexGroup justifyContent="flexStart">
                  <Info label="Type:" value={list.type} />
                  <Info
                    label="Update at:"
                    value={<FormattedDate value={list.updated_at} fieldName="updated_at" />}
                  />
                  <Info label="Updated by:" value={list.updated_by} />
                  {listItems && <Info label="Total items:" value={listItems?.total ?? '-'} />}
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem grow={true}>
                {canWriteIndex && (
                  <EuiFlexGroup justifyContent="flexEnd">
                    <AddListItemPopover listId={listId} />
                    <UploadListItem listId={listId} type={list.type} />
                  </EuiFlexGroup>
                )}
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
                placeholder={`Filter your data using KQL syntax - ${list.type}:*`}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={true} className={tableStyle}>
              <EuiBasicTable
                tableCaption="Demo of EuiBasicTable"
                items={listItems?.data ?? []}
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
        </>
      )}
    </EuiModal>
  );
};
