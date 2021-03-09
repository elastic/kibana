/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react-perf/jsx-no-new-function-as-prop */

/* eslint-disable react/jsx-no-bind */

/* eslint-disable react-perf/jsx-no-new-object-as-prop */

/* eslint-disable react/display-name */

/* eslint-disable react-perf/jsx-no-new-array-as-prop */

import React, { useState } from 'react';
import {
  EuiBasicTable,
  EuiButtonIcon,
  EuiHealth,
  EuiDescriptionList,
  RIGHT_ALIGNMENT,
} from '@elastic/eui';

// @ts-expect-error update types
export const ScheduledQueryQueriesTable = ({ data }) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const [sortField, setSortField] = useState('firstName');
  const [sortDirection, setSortDirection] = useState('asc');
  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState({});

  const onTableChange = ({ page = {}, sort = {} }) => {
    // @ts-expect-error update types
    const { index, size } = page;
    // @ts-expect-error update types
    const { field, direction } = sort;

    setPageIndex(index);
    setPageSize(size);
    setSortField(field);
    setSortDirection(direction);
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
      field: 'vars.id.value',
      name: 'ID',
    },
    {
      field: 'vars.interval.value',
      name: 'Interval',
    },
    {
      field: 'enabled',
      name: 'Active',
    },
    {
      name: 'Actions',
      actions: [
        {
          name: 'Clone',
          description: 'Clone this person',
          type: 'icon',
          icon: 'copy',
          onClick: () => '',
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
    totalItemCount: data.inputs[0].streams.length,
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
      items={data.inputs[0].streams}
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
