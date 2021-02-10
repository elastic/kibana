/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBasicTable, EuiButton, EuiButtonIcon, EuiCodeBlock } from '@elastic/eui';
import { RIGHT_ALIGNMENT } from '@elastic/eui/lib/services';
import React, { useCallback, useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { useHistory } from 'react-router-dom';

import { Direction } from '../../../common/search_strategy';
import { useKibana, useRouterNavigate } from '../../common/lib/kibana';

const ScheduledQueriesPageComponent = () => {
  const { push } = useHistory();
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const [sortField, setSortField] = useState('updated_at');
  const [sortDirection, setSortDirection] = useState(Direction.desc);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<Record<string, any>>({});
  const { http } = useKibana().services;
  const newQueryLinkProps = useRouterNavigate('scheduled_queries/new');

  const { data = {} } = useQuery(
    ['scheduledQueryList', { pageIndex, pageSize, sortField, sortDirection }],
    () =>
      http.get('/internal/osquery/scheduled_query', {
        query: {
          pageIndex,
          pageSize,
          sortField,
          sortDirection,
        },
      }),
    {
      keepPreviousData: true,
      // Refetch the data every 5 seconds
      refetchInterval: 5000,
    }
  );
  const { total = 0, items: savedQueries } = data;

  const toggleDetails = useCallback(
    (item) => () => {
      const itemIdToExpandedRowMapValues = { ...itemIdToExpandedRowMap };
      if (itemIdToExpandedRowMapValues[item.id]) {
        delete itemIdToExpandedRowMapValues[item.id];
      } else {
        // @ts-expect-error update types
        itemIdToExpandedRowMapValues[item.id] = item.inputs[0].streams.map((stream) => (
          <EuiCodeBlock key={stream} language="sql" fontSize="m" paddingSize="m">
            {`${stream.vars.query.value} every ${stream.vars.interval.value}s`}
          </EuiCodeBlock>
        ));
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

  const handleEditClick = useCallback((item) => push(`/scheduled_queries/${item.id}`), [push]);

  const columns = useMemo(
    () => [
      {
        field: 'name',
        name: 'Query name',
        sortable: true,
        truncateText: true,
      },
      {
        field: 'enabled',
        name: 'Active',
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
      initialSelected: [],
    }),
    []
  );

  return (
    <div>
      <EuiButton fill {...newQueryLinkProps}>
        {'New query'}
      </EuiButton>

      {savedQueries && (
        <EuiBasicTable
          items={savedQueries}
          itemId="id"
          // @ts-expect-error update types
          columns={columns}
          pagination={pagination}
          sorting={sorting}
          isSelectable={true}
          selection={selection}
          onChange={onTableChange}
          itemIdToExpandedRowMap={itemIdToExpandedRowMap}
          rowHeader="id"
        />
      )}
    </div>
  );
};

export const ScheduledQueriesPage = React.memo(ScheduledQueriesPageComponent);
