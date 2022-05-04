/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { type Criteria, EuiEmptyPrompt, EuiBasicTable, EuiBasicTableColumn } from '@elastic/eui';
import { EuiTableActionsColumnType } from '@elastic/eui/src/components/basic_table/table_types';
import { extractErrorMessage } from '../../../../common/utils/helpers';
import * as TEST_SUBJECTS from '../test_subjects';
import * as TEXT from '../translations';
import type { CspFinding, Pagination, Sorting } from '../types';
import type { CspFindingsResult } from './use_latest_findings';
import { FindingsRuleFlyout } from '../findings_flyout/findings_flyout';
import { getExpandColumn, getFindingsColumns } from '../layout/findings_layout';

interface BaseFindingsTableProps extends Pagination<CspFinding>, Sorting<CspFinding> {}

type FindingsTableProps = CspFindingsResult & BaseFindingsTableProps;

const FindingsTableComponent = ({
  error,
  data,
  loading,
  pagination,
  setPagination,
  sorting,
  setSorting,
}: FindingsTableProps) => {
  const [selectedFinding, setSelectedFinding] = useState<CspFinding>();

  const columns: [
    EuiTableActionsColumnType<CspFinding>,
    ...Array<EuiBasicTableColumn<CspFinding>>
  ] = useMemo(
    () => [getExpandColumn<CspFinding>({ onClick: setSelectedFinding }), ...getFindingsColumns()],
    []
  );

  const onTableChange = useCallback(
    (params: Criteria<CspFinding>) => {
      setPagination(params.page!);
      setSorting(params.sort!);
    },
    [setPagination, setSorting]
  );

  // Show "zero state"
  if (!loading && !data?.page.length)
    // TODO: use our own logo
    return (
      <EuiEmptyPrompt
        iconType="logoKibana"
        title={<h2>{TEXT.NO_FINDINGS}</h2>}
        data-test-subj={TEST_SUBJECTS.FINDINGS_TABLE_ZERO_STATE}
      />
    );

  return (
    <>
      <EuiBasicTable
        data-test-subj={TEST_SUBJECTS.FINDINGS_TABLE}
        loading={loading}
        error={error ? extractErrorMessage(error) : undefined}
        items={data?.page || []}
        columns={columns}
        pagination={pagination}
        sorting={sorting}
        onChange={onTableChange}
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
