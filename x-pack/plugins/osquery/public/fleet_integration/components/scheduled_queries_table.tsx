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
import { EuiBasicTable, EuiCodeBlock } from '@elastic/eui';

// @ts-expect-error update types
export const ScheduledQueryQueriesTable = ({ data }) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState('firstName');
  const [sortDirection, setSortDirection] = useState('asc');

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
      field: 'vars.query.value',
      name: 'Query',
      render: (query: string) => (
        <EuiCodeBlock language="sql" fontSize="s" paddingSize="none" transparentBackground>
          {query}
        </EuiCodeBlock>
      ),
    },
  ];

  const pagination = {
    pageIndex,
    pageSize,
    totalItemCount: data.inputs[0].streams.length,
    pageSizeOptions: [10, 20, 30],
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
      itemId="vars.id.value"
      isExpandable={true}
      columns={columns}
      pagination={pagination}
      // @ts-expect-error update types
      sorting={sorting}
      onChange={onTableChange}
    />
  );
};
