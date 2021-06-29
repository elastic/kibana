/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { map } from 'lodash/fp';
import {
  EuiBasicTable,
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  RIGHT_ALIGNMENT,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from 'react-query';

import { PackTableQueriesTable } from './pack_table_queries_table';
import { useKibana } from '../../common/lib/kibana';

interface PacksPageProps {
  onEditClick: (packId: string) => void;
  onNewClick: () => void;
}

const PacksPageComponent: React.FC<PacksPageProps> = ({ onNewClick, onEditClick }) => {
  const queryClient = useQueryClient();
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const [sortField, setSortField] = useState('updated_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const [selectedItems, setSelectedItems] = useState([]);
  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<Record<string, unknown>>({});
  const { http } = useKibana().services;

  const deletePacksMutation = useMutation(
    (payload) => http.delete(`/internal/osquery/pack`, { body: JSON.stringify(payload) }),
    {
      onSuccess: () => queryClient.invalidateQueries('packList'),
    }
  );

  const { data = {} } = useQuery(
    ['packList', { pageIndex, pageSize, sortField, sortDirection }],
    () =>
      http.get('/internal/osquery/pack', {
        query: {
          pageIndex,
          pageSize,
          sortField,
          sortDirection,
        },
      }),
    {
      keepPreviousData: true,
      // Refetch the data every 10 seconds
      refetchInterval: 5000,
    }
  );
  const { total = 0, saved_objects: packs } = data;

  const toggleDetails = useCallback(
    (item) => () => {
      const itemIdToExpandedRowMapValues = { ...itemIdToExpandedRowMap };
      if (itemIdToExpandedRowMapValues[item.id]) {
        delete itemIdToExpandedRowMapValues[item.id];
      } else {
        itemIdToExpandedRowMapValues[item.id] = (
          <>
            <PackTableQueriesTable items={item.queries} />
            <EuiSpacer />
          </>
        );
      }
      setItemIdToExpandedRowMap(itemIdToExpandedRowMapValues);
    },
    [itemIdToExpandedRowMap]
  );

  const renderExtendedItemToggle = useCallback(
    (item) => (
      <EuiButtonIcon
        onClick={toggleDetails(item)}
        aria-label={itemIdToExpandedRowMap[item.id] ? 'Collapse' : 'Expand'}
        iconType={itemIdToExpandedRowMap[item.id] ? 'arrowUp' : 'arrowDown'}
      />
    ),
    [itemIdToExpandedRowMap, toggleDetails]
  );

  const handleEditClick = useCallback((item) => onEditClick(item.id), [onEditClick]);

  const columns = useMemo(
    () => [
      {
        field: 'name',
        name: 'Pack name',
        sortable: true,
        truncateText: true,
      },
      {
        field: 'description',
        name: 'Description',
        sortable: true,
        truncateText: true,
      },
      {
        field: 'queries',
        name: 'Queries',
        sortable: false,
        // @ts-expect-error update types
        render: (queries) => queries.length,
      },
      {
        field: 'updated_at',
        name: 'Last updated at',
        sortable: true,
        truncateText: true,
      },
      {
        name: 'Actions',
        actions: [
          {
            name: 'Edit',
            description: 'Edit or run this query',
            type: 'icon',
            icon: 'documentEdit',
            onClick: handleEditClick,
          },
        ],
      },
      {
        align: RIGHT_ALIGNMENT,
        width: '40px',
        isExpander: true,
        render: renderExtendedItemToggle,
      },
    ],
    [handleEditClick, renderExtendedItemToggle]
  );

  const onTableChange = useCallback(({ page = {}, sort = {} }) => {
    setPageIndex(page.index);
    setPageSize(page.size);
    setSortField(sort.field);
    setSortDirection(sort.direction);
  }, []);

  const pagination = useMemo(
    () => ({
      pageIndex,
      pageSize,
      totalItemCount: total,
      pageSizeOptions: [3, 5, 8],
    }),
    [total, pageIndex, pageSize]
  );

  const sorting = useMemo(
    () => ({
      sort: {
        field: sortField,
        direction: sortDirection,
      },
    }),
    [sortDirection, sortField]
  );

  const selection = useMemo(
    () => ({
      selectable: () => true,
      onSelectionChange: setSelectedItems,
      initialSelected: [],
    }),
    []
  );

  const handleDeleteClick = useCallback(() => {
    const selectedItemsIds = map<string>('id', selectedItems);
    // @ts-expect-error update types
    deletePacksMutation.mutate({ packIds: selectedItemsIds });
  }, [deletePacksMutation, selectedItems]);

  return (
    <div>
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          {!selectedItems.length ? (
            <EuiButton fill onClick={onNewClick}>
              {'New pack'}
            </EuiButton>
          ) : (
            <EuiButton color="danger" iconType="trash" onClick={handleDeleteClick}>
              {`Delete ${selectedItems.length} packs`}
            </EuiButton>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer />

      {packs && (
        <EuiBasicTable
          items={packs}
          itemId="id"
          // @ts-expect-error update types
          columns={columns}
          pagination={pagination}
          // @ts-expect-error update types
          sorting={sorting}
          isSelectable={true}
          selection={selection}
          onChange={onTableChange}
          // @ts-expect-error update types
          itemIdToExpandedRowMap={itemIdToExpandedRowMap}
          rowHeader="id"
        />
      )}
    </div>
  );
};

export const PacksPage = React.memo(PacksPageComponent);
