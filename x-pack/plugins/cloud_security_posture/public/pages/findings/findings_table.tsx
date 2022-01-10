/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useMemo } from 'react';
import {
  Criteria,
  EuiLink,
  EuiPanel,
  EuiTableFieldDataColumnType,
  EuiBadgeGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
  EuiBasicTable,
  PropsOf,
  EuiBasicTableProps,
} from '@elastic/eui';
import { orderBy } from 'lodash';
import * as TEST_SUBJECTS from './test_subjects';
import * as TEXT from './translations';
import type { CspFinding, FindingsFetchState } from './types';
import { CspEvaluationBadge } from '../../components/csp_evaluation_badge';

interface BaseFindingsTableProps {
  selectItem(v: CspFinding | undefined): void;
}

type FindingsTableProps = FindingsFetchState & BaseFindingsTableProps;

export const FindingsTable = ({ data, status, error, selectItem }: FindingsTableProps) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const getCellProps = (item: CspFinding, column: EuiTableFieldDataColumnType<CspFinding>) => ({
    onClick: column.field === 'rule.name' ? () => selectItem(item) : undefined,
  });

  const onTableChange = ({ page }: Criteria<CspFinding>) => {
    if (!page) return;
    const { index, size } = page;

    setPageIndex(index);
    setPageSize(size);
  };

  const page = useMemo(
    () =>
      orderBy(data, ['@timestamp'], ['desc']).slice(
        pageIndex * pageSize,
        pageSize * pageIndex + pageSize
      ),
    [data, pageSize, pageIndex]
  );

  // TODO: add empty/error/loading views
  if (!data) return null;

  // TODO: async pagination
  const pagination: EuiBasicTableProps<CspFinding>['pagination'] = {
    pageIndex,
    pageSize,
    totalItemCount: data.length,
    pageSizeOptions: [5, 10, 25],
    hidePerPageOptions: false,
  };

  return (
    <EuiPanel hasBorder hasShadow={false}>
      <div>
        <h1>HENRY</h1>
      </div>
      <EuiBasicTable
        data-test-subj={TEST_SUBJECTS.FINDINGS_TABLE}
        loading={status === 'loading'}
        error={error ? error : undefined}
        items={page}
        columns={columns}
        tableLayout={'auto'}
        pagination={pagination}
        onChange={onTableChange}
        cellProps={getCellProps}
      />
    </EuiPanel>
  );
};

const ruleNameRenderer = (name: string) => <EuiLink>{name}</EuiLink>;

const resultEvaluationRenderer = (type: PropsOf<typeof CspEvaluationBadge>['type']) => (
  <CspEvaluationBadge type={type} />
);

// TODO: update CspFinding interface
const columns: Array<EuiTableFieldDataColumnType<CspFinding>> = [
  { field: 'resource.id', name: 'Resource ID' },
  { field: 'result.evaluation', name: 'Evaluation', render: resultEvaluationRenderer },
  { field: 'rule.name', name: 'Rule', render: ruleNameRenderer },
  { field: '', name: 'Cluster ID', render: () => null },
  { field: '', name: 'Resource Type', render: () => null },
  { field: '', name: 'Benchmark Integration', render: () => null },
  { field: '', name: 'Created at', render: () => null },
];
