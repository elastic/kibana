/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { isEqual } from 'lodash/fp';
import React, { useCallback, useMemo, useState } from 'react';

import type { Criteria } from '@elastic/eui';
import type { FileJSON } from '@kbn/shared-ux-file-types';

import { EuiFlexItem, EuiFlexGroup } from '@elastic/eui';

import type { CaseUI } from '../../../../common/ui/types';
import type { CaseFilesFilteringOptions } from '../../../containers/use_get_case_files';

import { CASE_VIEW_PAGE_TABS } from '../../../../common/types';
import { useGetCaseFiles } from '../../../containers/use_get_case_files';
import { FilesTable } from '../../files/files_table';
import { CaseViewTabs } from '../case_view_tabs';
import { FilesUtilityBar } from '../../files/files_utility_bar';

interface CaseViewFilesProps {
  caseData: CaseUI;
}

export const DEFAULT_CASE_FILES_FILTERING_OPTIONS = {
  page: 0,
  perPage: 10,
};

export const CaseViewFiles = ({ caseData }: CaseViewFilesProps) => {
  const [filteringOptions, setFilteringOptions] = useState<CaseFilesFilteringOptions>(
    DEFAULT_CASE_FILES_FILTERING_OPTIONS
  );
  const {
    data: caseFiles,
    isLoading,
    isPreviousData,
  } = useGetCaseFiles({
    ...filteringOptions,
    caseId: caseData.id,
  });

  const onTableChange = useCallback(
    ({ page }: Criteria<FileJSON>) => {
      if (page && !isPreviousData) {
        setFilteringOptions({
          ...filteringOptions,
          page: page.index,
          perPage: page.size,
        });
      }
    },
    [filteringOptions, isPreviousData]
  );

  const onSearchChange = useCallback(
    (newSearch: string) => {
      const trimSearch = newSearch.trim();
      if (!isEqual(trimSearch, filteringOptions.searchTerm)) {
        setFilteringOptions({
          ...filteringOptions,
          searchTerm: trimSearch,
        });
      }
    },
    [filteringOptions]
  );

  const pagination = useMemo(
    () => ({
      pageIndex: filteringOptions.page,
      pageSize: filteringOptions.perPage,
      totalItemCount: caseFiles?.total ?? 0,
      pageSizeOptions: [10, 25, 50],
      showPerPageOptions: true,
    }),
    [filteringOptions.page, filteringOptions.perPage, caseFiles?.total]
  );

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <CaseViewTabs caseData={caseData} activeTab={CASE_VIEW_PAGE_TABS.FILES} />
        <EuiFlexGroup>
          <EuiFlexItem>
            <FilesUtilityBar caseId={caseData.id} onSearch={onSearchChange} />
            <FilesTable
              caseId={caseData.id}
              isLoading={isLoading}
              items={caseFiles?.files ?? []}
              onChange={onTableChange}
              pagination={pagination}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

CaseViewFiles.displayName = 'CaseViewFiles';
