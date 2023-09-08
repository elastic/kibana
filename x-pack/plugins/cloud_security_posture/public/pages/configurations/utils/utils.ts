/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiThemeComputed } from '@elastic/eui';
import { LATEST_FINDINGS_RETENTION_POLICY } from '../../../../common/constants';
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

export const getFindingsTimeRangeQuery = (query) => ({
  ...query,
  bool: {
    ...query?.bool,
    filter: [
      ...(query?.bool?.filter || []),
      {
        range: {
          '@timestamp': {
            gte: `now-${LATEST_FINDINGS_RETENTION_POLICY}`,
          },
        },
      },
    ],
  },
});

export const getFindingsCountAggQuery = () => ({
  unique_event_code: {
    terms: {
      field: 'event.code',
      size: 65000,
    },
    aggs: {
      latest_result_evaluation: {
        top_hits: {
          _source: ['result.evaluation'],
          size: 1,
          sort: [{ '@timestamp': 'desc' }],
        },
      },
    },
  },
});

const isSelectedRow = (row: CspFinding, selected?: CspFinding) =>
  row.resource.id === selected?.resource.id && row.rule.id === selected?.rule.id;

export const getSelectedRowStyle = (
  theme: EuiThemeComputed,
  row: CspFinding,
  selected?: CspFinding
): React.CSSProperties => ({
  background: isSelectedRow(row, selected) ? theme.colors.highlight : undefined,
});
