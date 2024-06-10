/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiAutoRefresh, EuiBasicTable, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type {
  EuiBasicTableColumn,
  CriteriaWithPagination,
  OnRefreshChangeProps,
} from '@elastic/eui';
import { useFindBackfillsForRules } from '../../api/hooks/use_find_backfills_for_rules';
import { StopBackfill } from './stop_backfill';
import { BackfillStatusInfo } from './backfill_status';
import { FormattedDate } from '../../../../common/components/formatted_date';
import type { BackfillRow, BackfillStatus } from '../../types';
import * as i18n from '../../translations';
import { hasUserCRUDPermission } from '../../../../common/utils/privileges';
import { useUserData } from '../../../../detections/components/user_info';
import { getBackfillRowsFromResponse } from './utils';
import { HeaderSection } from '../../../../common/components/header_section';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';

const AUTO_REFRESH_INTERVAL = 3000;
const DEFAULT_PAGE_SIZE = 10;

const getBackfillsTableColumns = (hasCRUDPermissions: boolean) => {
  const stopAction = {
    render: (item: BackfillRow) => <StopBackfill id={item.id} />,
    width: '10%',
  };

  const columns: Array<EuiBasicTableColumn<BackfillRow>> = [
    {
      field: 'status',
      name: i18n.BACKFILLS_TABLE_COLUMN_STATUS,
      render: (value: BackfillStatus) => <BackfillStatusInfo status={value} />,
      width: '10%',
    },
    {
      field: 'created_at',
      name: i18n.BACKFILLS_TABLE_COLUMN_CREATED_AT,
      render: (value: 'string') => <FormattedDate value={value} fieldName={'created_at'} />,
      width: '20%',
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
      width: '30%',
    },
    {
      field: 'error',
      align: 'right',
      name: i18n.BACKFILLS_TABLE_COLUMN_ERROR,
      'data-test-subj': 'rule-backfills-column-error',
    },
    {
      field: 'pending',
      align: 'right',
      name: i18n.BACKFILLS_TABLE_COLUMN_PENDING,
      'data-test-subj': 'rule-backfills-column-pending',
    },
    {
      field: 'running',
      align: 'right',
      name: i18n.BACKFILLS_TABLE_COLUMN_RUNNING,
      'data-test-subj': 'rule-backfills-column-running',
    },
    {
      field: 'complete',
      align: 'right',
      name: i18n.BACKFILLS_TABLE_COLUMN_COMPLETED,
      'data-test-subj': 'rule-backfills-column-completed',
    },
    {
      field: 'total',
      align: 'right',
      name: i18n.BACKFILLS_TABLE_COLUMN_TOTAL,
      'data-test-subj': 'rule-backfills-column-total',
    },
  ];

  if (hasCRUDPermissions) {
    columns.push(stopAction);
  }

  return columns;
};

export const RuleBackfillsInfo = React.memo<{ ruleId: string }>(({ ruleId }) => {
  const isManualRuleRunEnabled = useIsExperimentalFeatureEnabled('manualRuleRunEnabled');
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(AUTO_REFRESH_INTERVAL);
  const [isAutoRefresh, setIsAutoRefresh] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [{ canUserCRUD }] = useUserData();
  const hasCRUDPermissions = hasUserCRUDPermission(canUserCRUD);

  const { data, isLoading, isError } = useFindBackfillsForRules(
    {
      ruleIds: [ruleId],
      page: pageIndex + 1,
      perPage: pageSize,
    },
    {
      refetchInterval: isAutoRefresh ? autoRefreshInterval : false,
      enabled: isManualRuleRunEnabled,
    }
  );

  if (!isManualRuleRunEnabled) {
    return null;
  }

  const backfills: BackfillRow[] = getBackfillRowsFromResponse(data?.data ?? []);

  const columns = getBackfillsTableColumns(hasCRUDPermissions);

  const pagination = {
    pageIndex,
    pageSize,
    totalItemCount: data?.total ?? 0,
  };

  if (data?.total === 0) return null;

  const handleRefreshChange = ({ isPaused, refreshInterval }: OnRefreshChangeProps) => {
    setIsAutoRefresh(!isPaused);
    setAutoRefreshInterval(refreshInterval);
  };

  const handleTableChange: (params: CriteriaWithPagination<BackfillRow>) => void = ({
    page,
    sort,
  }) => {
    if (page) {
      setPageIndex(page.index);
      setPageSize(page.size);
    }
  };

  return (
    <div>
      <EuiFlexGroup gutterSize="s" data-test-subj="rule-backfills-info">
        <EuiFlexItem grow={true}>
          <HeaderSection
            title={i18n.BACKFILL_TABLE_TITLE}
            subtitle={i18n.BACKFILL_TABLE_SUBTITLE}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiAutoRefresh
            isPaused={!isAutoRefresh}
            refreshInterval={autoRefreshInterval}
            onRefreshChange={handleRefreshChange}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiBasicTable
        data-test-subj="rule-backfills-table"
        items={backfills}
        columns={columns}
        pagination={pagination}
        error={isError ? 'error' : undefined}
        loading={isLoading}
        onChange={handleTableChange}
        noItemsMessage={'not found'}
      />
    </div>
  );
});

RuleBackfillsInfo.displayName = 'RuleBackfillsInfo';
