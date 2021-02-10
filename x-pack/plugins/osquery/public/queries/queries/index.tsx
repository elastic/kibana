/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { map } from 'lodash/fp';
import { EuiBasicTable, EuiButton, EuiButtonIcon, EuiCodeBlock } from '@elastic/eui';
import { RIGHT_ALIGNMENT } from '@elastic/eui/lib/services';
import React, { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from 'react-query';
import { useHistory } from 'react-router-dom';

import { useKibana, useRouterNavigate } from '../../common/lib/kibana';

const QueriesPageComponent = () => {
  const { push } = useHistory();
  const queryClient = useQueryClient();
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const [sortField, setSortField] = useState('updated_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const [selectedItems, setSelectedItems] = useState([]);
  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<Record<string, unknown>>({});
  const { http } = useKibana().services;
  const newQueryLinkProps = useRouterNavigate('queries/new');

  const deleteSavedQueriesMutation = useMutation(
    (payload) => http.delete(`/internal/osquery/saved_query`, { body: JSON.stringify(payload) }),
    {
      onSuccess: () => queryClient.invalidateQueries('savedQueryList'),
    }
  );

  const { data = {} } = useQuery(
    ['savedQueryList', { pageIndex, pageSize, sortField, sortDirection }],
    () =>
      http.get('/internal/osquery/saved_query', {
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
  const { total = 0, saved_objects: savedQueries } = data;

  const toggleDetails = useCallback(
    (item) => () => {
      const itemIdToExpandedRowMapValues = { ...itemIdToExpandedRowMap };
      if (itemIdToExpandedRowMapValues[item.id]) {
        delete itemIdToExpandedRowMapValues[item.id];
      } else {
        itemIdToExpandedRowMapValues[item.id] = (
          <EuiCodeBlock language="sql" fontSize="m" paddingSize="m">
            {item.attributes.command}
          </EuiCodeBlock>
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

  const handleEditClick = useCallback((item) => push(`/queries/${item.id}`), [push]);

  const columns = useMemo(
    () => [
      {
        field: 'attributes.title',
        name: 'Query name',
        sortable: true,
        truncateText: true,
      },
      {
        field: 'attributes.description',
        name: 'Description',
        sortable: true,
        truncateText: true,
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
    deleteSavedQueriesMutation.mutate({ savedQueryIds: selectedItemsIds });
  }, [deleteSavedQueriesMutation, selectedItems]);

  return (
    <div>
      {!selectedItems.length ? (
        <EuiButton fill {...newQueryLinkProps}>
          {'New query'}
        </EuiButton>
      ) : (
        <EuiButton color="danger" iconType="trash" onClick={handleDeleteClick}>
          {`Delete ${selectedItems.length} Queries`}
        </EuiButton>
      )}

      {savedQueries && (
        <EuiBasicTable
          items={savedQueries}
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

export const QueriesPage = React.memo(QueriesPageComponent);
