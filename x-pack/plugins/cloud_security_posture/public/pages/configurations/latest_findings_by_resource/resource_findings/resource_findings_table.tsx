/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import {
  EuiBasicTable,
  type CriteriaWithPagination,
  type Pagination,
  type EuiBasicTableColumn,
  type EuiTableActionsColumnType,
  type EuiBasicTableProps,
  useEuiTheme,
} from '@elastic/eui';
import { CspFinding } from '../../../../../common/schemas/csp_finding';
import {
  baseFindingsColumns,
  createColumnWithFilters,
  getExpandColumn,
  type OnAddFilter,
} from '../../layout/findings_layout';
import { FindingsRuleFlyout } from '../../findings_flyout/findings_flyout';
import { getSelectedRowStyle } from '../../utils/utils';
import * as TEST_SUBJECTS from '../../test_subjects';
import { EmptyState } from '../../../../components/empty_state';

export interface ResourceFindingsTableProps {
  items: CspFinding[];
  loading: boolean;
  pagination: Pagination & { pageSize: number };
  sorting: Required<EuiBasicTableProps<CspFinding>>['sorting'];
  setTableOptions(options: CriteriaWithPagination<CspFinding>): void;
  onAddFilter: OnAddFilter;
  onPaginateFlyout: (pageIndex: number) => void;
  onCloseFlyout: () => void;
  onOpenFlyout: (finding: CspFinding) => void;
  flyoutFindingIndex: number;
  onResetFilters: () => void;
}

const ResourceFindingsTableComponent = ({
  items,
  loading,
  pagination,
  sorting,
  setTableOptions,
  onAddFilter,
  onOpenFlyout,
  flyoutFindingIndex,
  onPaginateFlyout,
  onCloseFlyout,
  onResetFilters,
}: ResourceFindingsTableProps) => {
  const { euiTheme } = useEuiTheme();

  const selectedFinding = items[flyoutFindingIndex];

  const getRowProps = (row: CspFinding) => ({
    style: getSelectedRowStyle(euiTheme, row, selectedFinding),
    'data-test-subj': TEST_SUBJECTS.getResourceFindingsTableRowTestId(row.resource.id),
  });

  const columns: [
    EuiTableActionsColumnType<CspFinding>,
    ...Array<EuiBasicTableColumn<CspFinding>>
  ] = useMemo(
    () => [
      getExpandColumn<CspFinding>({ onClick: onOpenFlyout }),
      createColumnWithFilters(baseFindingsColumns['result.evaluation'], { onAddFilter }),
      baseFindingsColumns['rule.benchmark.rule_number'],
      createColumnWithFilters(baseFindingsColumns['rule.name'], { onAddFilter }),
      createColumnWithFilters(baseFindingsColumns['rule.section'], { onAddFilter }),
      baseFindingsColumns['@timestamp'],
    ],
    [onAddFilter, onOpenFlyout]
  );

  if (!loading && !items.length) {
    return <EmptyState onResetFilters={onResetFilters} />;
  }

  return (
    <>
      <EuiBasicTable
        data-test-subj={TEST_SUBJECTS.RESOURCES_FINDINGS_TABLE}
        loading={loading}
        items={items}
        columns={columns}
        onChange={setTableOptions}
        pagination={pagination}
        sorting={sorting}
        rowProps={getRowProps}
      />
      {selectedFinding && (
        <FindingsRuleFlyout
          findings={selectedFinding}
          onClose={onCloseFlyout}
          findingsCount={pagination.totalItemCount}
          flyoutIndex={flyoutFindingIndex + pagination.pageIndex * pagination.pageSize}
          onPaginate={onPaginateFlyout}
        />
      )}
    </>
  );
};

export const ResourceFindingsTable = React.memo(ResourceFindingsTableComponent);
