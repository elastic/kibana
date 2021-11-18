/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  Criteria,
  EuiBasicTableColumn,
  EuiTableFieldDataColumnType,
  EuiBadge,
  EuiBasicTable,
} from '@elastic/eui';

interface CSPFinding {
  agent: string;
  evaluation: 'pass' | 'fail';
  resource: string;
  rule: string;
  rule_id: string;
  run_id: string;
  severity: number;
  tags: string[];
  '@timestamp': string;
}
// TODO:
// 1. types
// 2. i18n

const getEvaluationBadge = (v: string) => {
  switch (v) {
    case 'pass':
      return <EuiBadge color="success">PASS</EuiBadge>;
    case 'fail':
      return <EuiBadge color="danger">FAIL</EuiBadge>;
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

const columns: Array<EuiTableFieldDataColumnType<CSPFinding>> = [
  {
    field: 'resource',
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
    field: 'evaluation',
    name: 'Evaluation',
    width: '80px',
    render: getEvaluationBadge,
  },
  {
    field: 'severity',
    name: 'severity',
    width: '80px',
    // render: getEvaluationBadge,
  },
  {
    field: 'tags',
    name: 'Tags',
    truncateText: true,
    render: getTagsBadges,
  },
  {
    field: 'run_id',
    name: 'Run Id',
    truncateText: true,
  },
];

interface FindingsTableProps {
  data: any[];
}

const sortComparator = (sortField: any, sortDir: string) => (a: any, b: any) => {
  // TODO: account for other types than string
  return sortDir === 'asc'
    ? b[sortField]?.localeCompare(a[sortField])
    : a[sortField]?.localeCompare(b[sortField]);
};

export const FindingsTable = ({ data }: FindingsTableProps) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [sortField, setSortField] = useState<typeof columns[number]['field']>('resource');
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
    pageSizeOptions: [5, 10, 25],
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
