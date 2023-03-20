/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { isEqual } from 'lodash/fp';
import React, { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';

import type { Criteria } from '@elastic/eui';
import type { FileJSON } from '@kbn/shared-ux-file-types';

import { EuiFlexItem, EuiFlexGroup, EuiFieldSearch, EuiButtonGroup } from '@elastic/eui';
import { useQueryClient } from '@tanstack/react-query';

import type { Case } from '../../../../common/ui/types';
import type { GetCaseFilesParams } from '../../../containers/use_get_case_files';

import { CASE_VIEW_PAGE_TABS } from '../../../../common/types';
import { casesQueriesKeys } from '../../../containers/constants';
import { useGetCaseFiles } from '../../../containers/use_get_case_files';
import { AddFile } from '../../add_file';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { FilesTable } from '../../files/files_table';
import { CaseViewTabs } from '../case_view_tabs';
import * as i18n from '../translations';

const HiddenButtonGroup = styled(EuiButtonGroup)`
  display: none;
`;

interface CaseViewFilesProps {
  caseData: Case;
}

export const CaseViewFiles = ({ caseData }: CaseViewFilesProps) => {
  const queryClient = useQueryClient();
  const { owner } = useCasesContext();
  const [filteringOptions, setFilteringOptions] = useState<GetCaseFilesParams>({
    page: 0,
    perPage: 10,
    caseId: caseData.id,
    owner: owner[0],
  });
  const { data: attachmentsData, isLoading } = useGetCaseFiles(filteringOptions);

  const onTableChange = useCallback(
    ({ page }: Criteria<FileJSON>) => {
      if (page) {
        setFilteringOptions({
          ...filteringOptions,
          page: page.index,
          perPage: page.size,
        });
      }
    },
    [filteringOptions]
  );

  const onSearchChange = useCallback(
    (newSearch) => {
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

  const refreshAttachmentsTable = useCallback(() => {
    queryClient.invalidateQueries(casesQueriesKeys.caseView());
  }, [queryClient]);

  const pagination = useMemo(
    () => ({
      pageIndex: filteringOptions.page,
      pageSize: filteringOptions.perPage,
      totalItemCount: attachmentsData?.total ?? 0,
      pageSizeOptions: [10, 25, 50],
      showPerPageOptions: true,
    }),
    [filteringOptions.page, filteringOptions.perPage, attachmentsData]
  );

  const tableViewSelectedId = 'tableViewSelectedId';
  const toggleButtonsIcons = [
    {
      id: 'thumbnailViewSelectedId',
      label: 'Thumbnail view',
      iconType: 'grid',
      isDisabled: true,
    },
    {
      id: tableViewSelectedId,
      label: 'Table view',
      iconType: 'editorUnorderedList',
    },
  ];

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <CaseViewTabs caseData={caseData} activeTab={CASE_VIEW_PAGE_TABS.FILES} />
        <EuiFlexGroup>
          <EuiFlexItem style={{ maxHeight: 300 }}>
            <EuiFlexGroup alignItems="center">
              <EuiFlexItem grow={false}>
                <AddFile
                  caseId={caseData.id}
                  onFileAdded={refreshAttachmentsTable}
                  owner={filteringOptions.owner}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false} style={{ minWidth: 400 }}>
                <EuiFieldSearch
                  fullWidth
                  placeholder={i18n.SEARCH_PLACEHOLDER}
                  onSearch={onSearchChange}
                  incremental={false}
                  data-test-subj="case-detail-search-file"
                />
              </EuiFlexItem>
              <EuiFlexItem />
              <EuiFlexItem grow={false}>
                <HiddenButtonGroup
                  legend="Text align"
                  options={toggleButtonsIcons}
                  idSelected={tableViewSelectedId}
                  onChange={() => {}}
                  isIconOnly
                />
              </EuiFlexItem>
            </EuiFlexGroup>
            <FilesTable
              isLoading={isLoading}
              items={attachmentsData?.files ?? []}
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
