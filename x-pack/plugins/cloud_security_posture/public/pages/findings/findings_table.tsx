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
import { TEST_SUBJECTS } from './constants';
import type { CspFinding, FindingsFetchState } from './types';
import { CSPEvaluationBadge } from '../../components/csp_evaluation_badge';

interface BaseFindingsTableProps {
  selectItem(v: CspFinding | undefined): void;
}

type FindingsTableProps = FindingsFetchState & BaseFindingsTableProps;

export const FindingsTable = ({ data, status, error, selectItem }: FindingsTableProps) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(25);

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
  );
};

const ruleNameRenderer = (name: string) => <EuiLink>{name}</EuiLink>;
const ruleTagsRenderer = (tags: string[]) => (
  <EuiFlexGroup>
    <EuiFlexItem>
      <EuiBadgeGroup>
        {tags.map((tag) => (
          <EuiBadge key={tag} color="default">
            {tag}
          </EuiBadge>
        ))}
      </EuiBadgeGroup>
    </EuiFlexItem>
  </EuiFlexGroup>
);
const resultEvaluationRenderer = (type: PropsOf<typeof CSPEvaluationBadge>['type']) => (
  <CSPEvaluationBadge type={type} />
);

const columns: Array<EuiTableFieldDataColumnType<CspFinding>> = [
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
    render: ruleNameRenderer,
  },
  {
    field: 'result.evaluation',
    name: 'Evaluation',
    width: '80px',
    render: resultEvaluationRenderer,
  },
  {
    field: 'rule.tags',
    name: 'Tags',
    render: ruleTagsRenderer,
  },
  {
    field: '@timestamp',
    name: 'Timestamp',
    truncateText: true,
  },
];
