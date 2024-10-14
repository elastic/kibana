/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo, useState } from 'react';

import type { EuiTableSelectionType } from '@elastic/eui';

import { EuiFlexItem, EuiFlexGroup } from '@elastic/eui';

import { useGetSimilarCases } from '../../../containers/use_get_similar_cases';
import { useBulkGetUserProfiles } from '../../../containers/user_profiles/use_bulk_get_user_profiles';
import { initialData } from '../../../containers/use_get_cases';
import type { CaseUI, CasesUI } from '../../../../common/ui/types';

import { CASE_VIEW_PAGE_TABS } from '../../../../common/types';
import { CaseViewTabs } from '../case_view_tabs';
import { CasesTable } from '../../all_cases/table';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { isReadOnlyPermissions } from '../../../utils/permissions';
import { useCasesColumns } from '../../all_cases/use_cases_columns';
import { useCasesColumnsSelection } from '../../all_cases/use_cases_columns_selection';
import { CASES_TABLE_PER_PAGE_VALUES, type EuiBasicTableOnChange } from '../../all_cases/types';

interface CaseViewSimilarCasesProps {
  caseData: CaseUI;
}

export const DEFAULT_CASE_FILES_FILTERING_OPTIONS = {
  page: 0,
  perPage: 10,
};

export const CaseViewSimilarCases = ({ caseData }: CaseViewSimilarCasesProps) => {
  const { permissions } = useCasesContext();

  const [selectedCases, setSelectedCases] = useState<CasesUI>([]);

  const euiBasicTableSelectionProps = useMemo<EuiTableSelectionType<CaseUI>>(
    () => ({
      onSelectionChange: setSelectedCases,
      selected: selectedCases,
      selectable: () => !isReadOnlyPermissions(permissions),
    }),
    [permissions, selectedCases]
  );

  const { selectedColumns } = useCasesColumnsSelection();

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(CASES_TABLE_PER_PAGE_VALUES[0]);

  const { data = initialData, isFetching: isLoadingCases } = useGetSimilarCases({
    caseData,
    pageIndex,
    pageSize,
  });

  const tableOnChangeCallback = useCallback(({ page, sort }: EuiBasicTableOnChange) => {
    setPageIndex(page.index);
    setPageSize(page.size);
  }, []);

  const pagination = useMemo(
    () => ({
      pageIndex,
      pageSize,
      totalItemCount: data.total ?? 0,
      pageSizeOptions: CASES_TABLE_PER_PAGE_VALUES,
    }),
    [data.total, pageIndex, pageSize]
  );

  const assigneesFromCases = useMemo(() => {
    return data.cases.reduce<Set<string>>((acc, caseInfo) => {
      if (!caseInfo) {
        return acc;
      }

      for (const assignee of caseInfo.assignees) {
        acc.add(assignee.uid);
      }
      return acc;
    }, new Set());
  }, [data.cases]);

  const { data: userProfiles } = useBulkGetUserProfiles({
    uids: Array.from(assigneesFromCases),
  });

  const { columns, isLoadingColumns } = useCasesColumns({
    filterStatus: [],
    userProfiles: userProfiles ?? new Map(),
    isSelectorView: false,
    disableActions: selectedCases.length > 0,
    selectedColumns,
  });

  const tableRowProps = useCallback(
    (theCase: CaseUI) => ({
      'data-test-subj': `cases-table-row-${theCase.id}`,
    }),
    []
  );

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <CaseViewTabs caseData={caseData} activeTab={CASE_VIEW_PAGE_TABS.SIMILAR_CASES} />
        <EuiFlexGroup>
          <EuiFlexItem>
            <CasesTable
              columns={columns}
              selection={euiBasicTableSelectionProps}
              data={data}
              isCasesLoading={isLoadingCases}
              pagination={pagination}
              isCommentUpdating={false}
              isDataEmpty={false}
              onChange={tableOnChangeCallback}
              sorting={undefined}
              tableRowProps={tableRowProps}
              isLoadingColumns={isLoadingColumns}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

CaseViewSimilarCases.displayName = 'CaseViewObservables';
