/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-shadow, react-perf/jsx-no-new-object-as-prop, react/jsx-no-bind, react-perf/jsx-no-new-function-as-prop, react-perf/jsx-no-new-array-as-prop */

import { find } from 'lodash/fp';
import React, { useState } from 'react';
import {
  EuiBasicTable,
  EuiButtonIcon,
  EuiHealth,
  EuiDescriptionList,
  RIGHT_ALIGNMENT,
} from '@elastic/eui';

// @ts-expect-error update types
const PackQueriesTableComponent = ({ items, config, handleRemoveQuery }) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState('firstName');
  const [sortDirection, setSortDirection] = useState('asc');
  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState({});
  const totalItemCount = 100;

  const onTableChange = ({ page = {}, sort = {} }) => {
    // @ts-expect-error update types
    const { index: pageIndex, size: pageSize } = page;

    // @ts-expect-error update types
    const { field: sortField, direction: sortDirection } = sort;

    setPageIndex(pageIndex);
    setPageSize(pageSize);
    setSortField(sortField);
    setSortDirection(sortDirection);
  };

  // @ts-expect-error update types
  const toggleDetails = (item) => {
    const itemIdToExpandedRowMapValues = { ...itemIdToExpandedRowMap };
    // @ts-expect-error update types
    if (itemIdToExpandedRowMapValues[item.id]) {
      // @ts-expect-error update types
      delete itemIdToExpandedRowMapValues[item.id];
    } else {
      const { online } = item;
      const color = online ? 'success' : 'danger';
      const label = online ? 'Online' : 'Offline';
      const listItems = [
        {
          title: 'Nationality',
          description: `aa`,
        },
        {
          title: 'Online',
          description: <EuiHealth color={color}>{label}</EuiHealth>,
        },
      ];
      // @ts-expect-error update types
      itemIdToExpandedRowMapValues[item.id] = <EuiDescriptionList listItems={listItems} />;
    }
    setItemIdToExpandedRowMap(itemIdToExpandedRowMapValues);
  };

  const columns = [
    {
      field: 'name',
      name: 'Query Name',
    },
    {
      name: 'Interval',
      // @ts-expect-error update types
      render: (query) => find(['name', query.name], config).interval,
    },
    {
      name: 'Actions',
      actions: [
        {
          name: 'Remove',
          description: 'Remove this query',
          type: 'icon',
          icon: 'trash',
          onClick: handleRemoveQuery,
        },
      ],
    },
    {
      align: RIGHT_ALIGNMENT,
      width: '40px',
      isExpander: true,
      // @ts-expect-error update types
      render: (item) => (
        <EuiButtonIcon
          onClick={() => toggleDetails(item)}
          // @ts-expect-error update types
          aria-label={itemIdToExpandedRowMap[item.id] ? 'Collapse' : 'Expand'}
          // @ts-expect-error update types
          iconType={itemIdToExpandedRowMap[item.id] ? 'arrowUp' : 'arrowDown'}
        />
      ),
    },
  ];

  const pagination = {
    pageIndex,
    pageSize,
    totalItemCount,
    pageSizeOptions: [3, 5, 8],
  };

  const sorting = {
    sort: {
      field: sortField,
      direction: sortDirection,
    },
  };

  return (
    <EuiBasicTable
      items={items}
      itemId="id"
      itemIdToExpandedRowMap={itemIdToExpandedRowMap}
      isExpandable={true}
      hasActions={true}
      // @ts-expect-error update types
      columns={columns}
      pagination={pagination}
      // @ts-expect-error update types
      sorting={sorting}
      isSelectable={true}
      onChange={onTableChange}
    />
  );
};

export const PackQueriesTable = React.memo(PackQueriesTableComponent);
