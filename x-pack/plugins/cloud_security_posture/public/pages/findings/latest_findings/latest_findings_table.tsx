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
  EuiBasicTableColumn,
  type Pagination,
  type EuiBasicTableProps,
  type CriteriaWithPagination,
  type EuiTableActionsColumnType,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import * as TEST_SUBJECTS from '../test_subjects';
import type { CspFinding } from '../types';
import { FindingsRuleFlyout } from '../findings_flyout/findings_flyout';
import { getExpandColumn, getFindingsColumns } from '../layout/findings_layout';

type TableProps = Required<EuiBasicTableProps<CspFinding>>;

interface Props {
  loading: boolean;
  items: CspFinding[];
  pagination: Pagination;
  sorting: TableProps['sorting'];
  setTableOptions(options: CriteriaWithPagination<CspFinding>): void;
}

const FindingsTableComponent = ({
  loading,
  items,
  pagination,
  sorting,
  setTableOptions,
}: Props) => {
  const [selectedFinding, setSelectedFinding] = useState<CspFinding>();

  const columns: [
    EuiTableActionsColumnType<CspFinding>,
    ...Array<EuiBasicTableColumn<CspFinding>>
  ] = useMemo(
    () => [getExpandColumn<CspFinding>({ onClick: setSelectedFinding }), ...getFindingsColumns()],
    []
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
