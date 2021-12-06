/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useState } from 'react';
import {
  Criteria,
  EuiLink,
  EuiTableFieldDataColumnType,
  EuiBadge,
  EuiBasicTable,
  PropsOf,
  EuiBasicTableProps,
} from '@elastic/eui';
import { orderBy } from 'lodash';
import { CSPFinding, FetchState } from './types';
import { FindingsRuleFlyout } from './findings_flyout';
import { CSPEvaluationBadge } from '../../components/csp_evaluation_badge';

type FindingsTableProps = FetchState<CSPFinding[]>;

/**
 * Temporary findings table
 */
export const FindingsTable = ({ data, loading, error }: FindingsTableProps) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [sortField, setSortField] = useState<keyof CSPFinding>('resource');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedFinding, setSelectedFinding] = useState<CSPFinding | undefined>();
  const columns = useMemo(getColumns, []);

  const getCellProps = (item: CSPFinding, column: EuiTableFieldDataColumnType<CSPFinding>) => ({
    onClick: column.field === 'rule.name' ? () => setSelectedFinding(item) : undefined,
  });

  const onTableChange = ({ page, sort }: Criteria<CSPFinding>) => {
    if (!page || !sort) return;
    const { index, size } = page;
    const { field, direction } = sort;

    setPageIndex(index);
    setPageSize(size);
    setSortField(field as keyof CSPFinding);
    setSortDirection(direction);
  };

  // TODO: add empty/error/loading views
  if (!data) return null;

  // TODO: async pagination?
  const pagination: EuiBasicTableProps<CSPFinding>['pagination'] = {
    pageIndex,
    pageSize,
    totalItemCount: data.length,
    pageSizeOptions: [5, 10, 25],
    hidePerPageOptions: false,
  };

  // TODO: async sorting?
  const sorting: EuiBasicTableProps<CSPFinding>['sorting'] = {
    sort: {
      field: sortField,
      direction: sortDirection,
    },
    enableAllColumns: true,
  };

  const sortedData = orderBy(data, ['@timestamp'], ['desc']);
  const page = sortedData.slice(pageIndex * pageSize, pageSize * pageIndex + pageSize);

  return (
    <>
      <EuiBasicTable
        loading={loading}
        error={error ? error : undefined}
        items={page}
        columns={columns}
        tableLayout={'auto'}
        pagination={pagination}
        sorting={sorting}
        onChange={onTableChange}
        cellProps={getCellProps}
      />
      {selectedFinding && (
        <FindingsRuleFlyout
          findings={selectedFinding}
          onClose={() => setSelectedFinding(undefined)}
        />
      )}
    </>
  );
};

const RuleName = (v: string) => <EuiLink href="#">{v}</EuiLink>;
const RuleTags = (v: string[]) => v.map((x) => <EuiBadge color="default">{x}</EuiBadge>);
const ResultEvaluation = (v: PropsOf<typeof CSPEvaluationBadge>['type']) => (
  <CSPEvaluationBadge type={v} />
);

const getColumns = (): Array<EuiTableFieldDataColumnType<CSPFinding>> => [
  {
    field: 'resource.filename',
    name: 'Resource',
    truncateText: true,
  },
  {
    field: 'rule.name',
    name: 'Rule Name',
    width: '50%',
    truncateText: true,
    render: RuleName,
  },
  {
    field: 'result.evaluation',
    name: 'Evaluation',
    width: '80px',
    render: ResultEvaluation,
  },
  {
    field: 'rule.tags',
    name: 'Tags',
    truncateText: true,
    // TODO: tags need to be truncated (as they are components, not texts)
    // and on hover they should show the full tags
    // currently causes the table to overflow its parent
    render: RuleTags,
  },
  {
    field: '@timestamp',
    name: 'Timestamp',
    truncateText: true,
  },
];
