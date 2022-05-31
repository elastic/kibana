/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { VFC } from 'react';
import { formatDate, EuiBasicTable, EuiLink, EuiHealth } from '@elastic/eui';
import { Feed } from '../../../../common/types/Feed';

const columns = [
  {
    field: 'name',
    name: 'Name',
    sortable: true,
    mobileOptions: {
      render: (item: Feed) => (
        <span>
          <EuiLink href="#" target="_blank">
            {item.name}
          </EuiLink>
        </span>
      ),
      header: false,
      truncateText: false,
      enlarge: true,
      width: '100%',
    },
  },
  {
    field: 'lastSeen',
    name: 'Last seen',
    dataType: 'date',
    render: (date: Date) => formatDate(date, 'longDateTime'),
  },
  {
    field: 'online',
    name: 'Online',
    dataType: 'boolean',
    render: (online: boolean) => {
      const color = online ? 'success' : 'danger';
      const label = online ? 'Online' : 'Offline';
      return <EuiHealth color={color}>{label}</EuiHealth>;
    },
  },
];

const getRowProps = (item: Feed) => {
  const { name } = item;
  return {
    'data-test-subj': `row-${name}`,
    className: 'customRowClass',
    onClick: () => {},
  };
};

const getCellProps = (item: Feed, column: any) => {
  const { name } = item;
  const { field } = column;
  return {
    className: 'customCellClass',
    'data-test-subj': `cell-${name}-${field}`,
    textOnly: true,
  };
};

export const SourcesTable: VFC<{ isLoading: boolean; items: Feed[] }> = ({ items, isLoading }) => {
  return (
    <EuiBasicTable
      loading={isLoading}
      items={items}
      rowHeader="name"
      columns={columns as any}
      rowProps={getRowProps}
      cellProps={getCellProps}
    />
  );
};
