/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiBasicTable } from '@elastic/eui';
import type { EuiBasicTableColumn, CriteriaWithPagination } from '@elastic/eui';
import { useFindBackfillsForRules } from '../../api/hooks/use_find_backfills_for_rules';
import { StopBackfill } from './stop_backfill';
import { BackfillStatusInfo } from './backfill_status';
import { FormattedDate } from '../../../../common/components/formatted_date';
import type { BackfillRow } from '../../types';
import * as i18n from '../../translations';

export const RuleBackfillsInfo = React.memo<{ ruleId: string }>(({ ruleId }) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const { data, isLoading, isError } = useFindBackfillsForRules({
    ruleIds: [ruleId],
    page: pageIndex + 1,
    perPage: pageSize,
  });

  const backfills: BackfillRow[] =
    data?.rules
      ?.filter?.((r) => r.rule.id === ruleId)
      ?.map((backfill) => ({
        ...backfill,
        total: backfill?.schedule?.length ?? 0,
        completed: backfill?.schedule?.filter((s) => s.status === 'complete').length ?? 0,
        error: backfill?.schedule?.filter((s) => s.status === 'error').length ?? 0,
      })) ?? [];

  const onTableChange: (params: CriteriaWithPagination<BackfillRow>) => void = ({ page, sort }) => {
    if (page) {
      setPageIndex(page.index);
      setPageSize(page.size);
    }
  };

  const columns: Array<EuiBasicTableColumn<BackfillRow>> = [
    {
      field: 'status',
      name: i18n.BACKFILLS_TABLE_COLUMN_STATUS,
      render: (value) => <BackfillStatusInfo status={value} />,
    },
    {
      field: 'created_at',
      name: i18n.BACKFILLS_TABLE_COLUMN_CREATED_AT,
      render: (value: 'string') => <FormattedDate value={value} fieldName={'created_at'} />,
      width: '15%',
    },
    {
      name: i18n.BACKFILLS_TABLE_COLUMN_SOURCE_TIME_RANCE,
      render: (value: BackfillRow) => (
        <>
          <FormattedDate value={value.start} fieldName={'start'} />
          {' - '}
          <FormattedDate value={value.end} fieldName={'end'} />
        </>
      ),
      width: '50%',
    },
    {
      field: 'error',
      name: i18n.BACKFILLS_TABLE_COLUMN_ERROR,
    },
    {
      field: 'completed',
      name: i18n.BACKFILLS_TABLE_COLUMN_COMPLETED,
    },
    {
      field: 'total',
      name: i18n.BACKFILLS_TABLE_COLUMN_TOTAL,
    },
    {
      render: (item: BackfillRow) => <StopBackfill id={item.id} />,
    },
  ];

  const pagination = {
    pageIndex,
    pageSize,
    totalItemCount: data?.total ?? 0,
    pageSizeOptions: [5, 10, 25],
  };

  if (data?.total === 0) return null;

  return (
    <div>
      <EuiBasicTable
        data-test-subj="rule-backfills-table"
        items={backfills}
        columns={columns}
        pagination={pagination}
        // sorting={sorting}
        error={isError ? 'error' : undefined}
        loading={isLoading}
        onChange={onTableChange}
        noItemsMessage={'not found'}
      />
    </div>
  );
});

RuleBackfillsInfo.displayName = 'RuleBackfillsInfo';
