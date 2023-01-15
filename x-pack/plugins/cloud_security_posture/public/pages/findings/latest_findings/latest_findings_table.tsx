/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useState } from 'react';
import {
  EuiEmptyPrompt,
  EuiBasicTable,
  useEuiTheme,
  type Pagination,
  type EuiBasicTableProps,
  type CriteriaWithPagination,
  type EuiTableActionsColumnType,
  type EuiTableFieldDataColumnType,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
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

type TableProps = Required<EuiBasicTableProps<CspFinding>>;

interface Props {
  loading: boolean;
  items: CspFinding[];
  pagination: Pagination;
  sorting: TableProps['sorting'];
  setTableOptions(options: CriteriaWithPagination<CspFinding>): void;
  onAddFilter: OnAddFilter;
}

const FindingsTableComponent = ({
  loading,
  items,
  pagination,
  sorting,
  setTableOptions,
  onAddFilter,
}: Props) => {
  const { euiTheme } = useEuiTheme();
  const [selectedFinding, setSelectedFinding] = useState<CspFinding>();

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
      getExpandColumn<CspFinding>({ onClick: setSelectedFinding }),
      createColumnWithFilters(baseFindingsColumns['result.evaluation'], { onAddFilter }),
      createColumnWithFilters(baseFindingsColumns['resource.id'], { onAddFilter }),
      createColumnWithFilters(baseFindingsColumns['resource.name'], { onAddFilter }),
      createColumnWithFilters(baseFindingsColumns['resource.sub_type'], { onAddFilter }),
      createColumnWithFilters(baseFindingsColumns['rule.rule_number'], { onAddFilter }),
      createColumnWithFilters(baseFindingsColumns['rule.name'], { onAddFilter }),
      baseFindingsColumns['rule.section'],
      baseFindingsColumns['@timestamp'],
    ],
    [onAddFilter]
  );

  // Show "zero state"
  if (!loading && !items.length)
    // TODO: use our own logo
    return (
      <EuiEmptyPrompt
        iconType="logoKibana"
        data-test-subj={TEST_SUBJECTS.LATEST_FINDINGS_TABLE_NO_FINDINGS_EMPTY_STATE}
        title={
          <h2>
            <FormattedMessage
              id="xpack.csp.findings.latestFindings.noFindingsTitle"
              defaultMessage="There are no Findings"
            />
          </h2>
        }
      />
    );

  return (
    <>
      <EuiBasicTable
        loading={loading}
        data-test-subj={TEST_SUBJECTS.FINDINGS_TABLE}
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
          onClose={() => setSelectedFinding(undefined)}
        />
      )}
    </>
  );
};

export const FindingsTable = React.memo(FindingsTableComponent);
