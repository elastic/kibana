/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { Criteria, EuiBasicTableColumn, EuiBadge, EuiBasicTable } from '@elastic/eui';

// TODO:
// 1. types
// 2. i18n

const getEvaluationBadge = (v: string) => {
  switch (v) {
    case 'pass':
      return <EuiBadge color="success">Pass</EuiBadge>;
    case 'Fail':
      return <EuiBadge color="danger">Fail</EuiBadge>;
    default:
      return <EuiBadge color="default">N/A</EuiBadge>;
  }
};

const getTagsBadges = (v: string[]) => (
  <>
    {v.map((x) => (
      <EuiBadge color="default">{x}</EuiBadge>
    ))}
  </>
);

const columns: Array<EuiBasicTableColumn<unknown>> = [
  {
    field: 'Resource',
    name: 'Resource',
    width: '20%',
    truncateText: true,
  },
  {
    field: 'rule',
    name: 'Rule Description',
    width: '50%',
    truncateText: true,
  },
  {
    field: 'Evaluation',
    name: 'Evaluation',
    width: '80px',
    render: getEvaluationBadge,
  },
  {
    field: 'Tags',
    name: 'Tags',
    truncateText: true,
    render: getTagsBadges,
  },
];

interface FindingsTableProps {
  data: any[];
}

const sortComparator = (sortField: any, sortDir: string) => (a: any, b: any) => {
  // TODO: account for other types than string
  return sortDir === 'asc'
    ? b[sortField].localeCompare(a[sortField])
    : a[sortField].localeCompare(b[sortField]);
};

export const FindingsTable = ({ data }: FindingsTableProps) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const [sortField, setSortField] = useState('Resource');
  const [sortDirection, setSortDirection] = useState('asc');

  const onTableChange = ({ page, sort }: Criteria<any>) => {
    if (!page || !sort) return;
    const { index, size } = page;
    const { field, direction } = sort;

    setPageIndex(index);
    setPageSize(size);
    setSortField(field as string);
    setSortDirection(direction);
  };

  const pagination = {
    pageIndex,
    pageSize,
    totalItemCount: data.length,
    pageSizeOptions: [3, 5, 8],
    hidePerPageOptions: false,
  };

  const sorting = {
    sort: {
      field: sortField,
      direction: sortDirection as any,
    },
    enableAllColumns: true,
  };

  const sortedData = data.slice().sort(sortComparator(sortField, sortDirection));
  const page = sortedData.slice(pageIndex * pageSize, pageSize * pageIndex + pageSize);

  return (
    <EuiBasicTable
      items={page}
      columns={columns}
      tableLayout={'auto'}
      pagination={pagination}
      sorting={sorting}
      onChange={onTableChange}
    />
  );
};
