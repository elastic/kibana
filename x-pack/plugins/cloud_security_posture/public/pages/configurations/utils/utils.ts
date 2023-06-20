/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { EuiThemeComputed } from '@elastic/eui';
import type { CspFinding } from '../../../../common/schemas/csp_finding';
export { getFilters } from './get_filters';

export const getFindingsPageSizeInfo = ({
  currentPageSize,
  pageIndex,
  pageSize,
}: Record<'pageIndex' | 'pageSize' | 'currentPageSize', number>) => ({
  pageStart: pageIndex * pageSize + 1,
  pageEnd: pageIndex * pageSize + currentPageSize,
});

export const getFindingsCountAggQuery = () => ({
  count: { terms: { field: 'result.evaluation' } },
});

export const getAggregationCount = (
  buckets: Array<estypes.AggregationsStringRareTermsBucketKeys | undefined>
) => {
  const passed = buckets.find((bucket) => bucket?.key === 'passed');
  const failed = buckets.find((bucket) => bucket?.key === 'failed');

  return {
    passed: passed?.doc_count || 0,
    failed: failed?.doc_count || 0,
  };
};

const isSelectedRow = (row: CspFinding, selected?: CspFinding) =>
  row.resource.id === selected?.resource.id && row.rule.id === selected?.rule.id;

export const getSelectedRowStyle = (
  theme: EuiThemeComputed,
  row: CspFinding,
  selected?: CspFinding
): React.CSSProperties => ({
  background: isSelectedRow(row, selected) ? theme.colors.highlight : undefined,
});
