/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import {
  EuiBasicTable,
  useEuiTheme,
  type Pagination,
  type EuiBasicTableProps,
  type CriteriaWithPagination,
  type EuiTableActionsColumnType,
  type EuiTableFieldDataColumnType,
} from '@elastic/eui';
import { CspFinding } from '../../../../common/schemas/csp_finding';
import * as TEST_SUBJECTS from '../test_subjects';
import { FindingsRuleFlyout } from '../findings_flyout/findings_flyout';
import {
  baseFindingsColumns,
  createColumnWithFilters,
  getExpandColumn,
  type OnAddFilter,
} from '../layout/findings_layout';
import { getSelectedRowStyle } from '../utils/utils';
import { EmptyState } from '../../../components/empty_state';

type TableProps = Required<EuiBasicTableProps<CspFinding>>;

interface Props {
  loading: boolean;
  items: CspFinding[];
  pagination: Pagination & { pageSize: number };
  sorting: TableProps['sorting'];
  setTableOptions(options: CriteriaWithPagination<CspFinding>): void;
  onAddFilter: OnAddFilter;
  onPaginateFlyout: (pageIndex: number) => void;
  onCloseFlyout: () => void;
  onOpenFlyout: (finding: CspFinding) => void;
  flyoutFindingIndex: number;
  onResetFilters: () => void;
}

const FindingsTableComponent = ({
  loading,
  items,
  pagination,
  sorting,
  setTableOptions,
  onAddFilter,
  onOpenFlyout,
  flyoutFindingIndex,
  onPaginateFlyout,
  onCloseFlyout,
  onResetFilters,
}: Props) => {
  const { euiTheme } = useEuiTheme();

  const selectedFinding = items[flyoutFindingIndex];

  const getRowProps = (row: CspFinding) => ({
    'data-test-subj': TEST_SUBJECTS.getFindingsTableRowTestId(row.resource.id),
    style: getSelectedRowStyle(euiTheme, row, selectedFinding),
  });

  const getCellProps = (row: CspFinding, column: EuiTableFieldDataColumnType<CspFinding>) => ({
    'data-test-subj': TEST_SUBJECTS.getFindingsTableCellTestId(column.field, row.resource.id),
  });

  const columns: [
    EuiTableActionsColumnType<CspFinding>,
    ...Array<EuiTableFieldDataColumnType<CspFinding>>
  ] = useMemo(
    () => [
      getExpandColumn<CspFinding>({ onClick: onOpenFlyout }),
      createColumnWithFilters(baseFindingsColumns['result.evaluation'], { onAddFilter }),
      createColumnWithFilters(baseFindingsColumns['resource.id'], { onAddFilter }),
      createColumnWithFilters(baseFindingsColumns['resource.name'], { onAddFilter }),
      createColumnWithFilters(baseFindingsColumns['resource.sub_type'], { onAddFilter }),
      baseFindingsColumns['rule.benchmark.rule_number'],
      createColumnWithFilters(baseFindingsColumns['rule.name'], { onAddFilter }),
      createColumnWithFilters(baseFindingsColumns['rule.section'], { onAddFilter }),
      baseFindingsColumns['@timestamp'],
    ],
    [onOpenFlyout, onAddFilter]
  );

  if (!loading && !items.length) {
    return <EmptyState onResetFilters={onResetFilters} />;
  }

  return (
    <>
      <EuiBasicTable
        loading={loading}
        data-test-subj={TEST_SUBJECTS.LATEST_FINDINGS_TABLE}
        items={items}
        columns={columns}
        pagination={pagination}
        sorting={sorting}
        onChange={setTableOptions}
        rowProps={getRowProps}
        cellProps={getCellProps}
        hasActions
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

export const FindingsTable = React.memo(FindingsTableComponent);
