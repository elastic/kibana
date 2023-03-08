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

import { EuiFlexItem, EuiFlexGroup, EuiFieldSearch, EuiButtonGroup } from '@elastic/eui';
import { useQueryClient } from '@tanstack/react-query';

import type { Case } from '../../../../common/ui/types';
import type { GetCaseAttachmentsParams } from '../../../containers/use_get_case_attachments';

import { CaseViewTabs } from '../case_view_tabs';
import { CASE_VIEW_PAGE_TABS } from '../../../../common/types';
import { useGetCaseAttachments } from '../../../containers/use_get_case_attachments';
import { AttachmentsTable } from '../../attachments/attachments_table';
import { AddFile } from '../../add_file';
import { casesQueriesKeys } from '../../../containers/constants';

interface CaseViewAttachmentsProps {
  caseData: Case;
}

export const CaseViewAttachments = ({ caseData }: CaseViewAttachmentsProps) => {
  const queryClient = useQueryClient();
  const [filteringOptions, setFilteringOptions] = useState<GetCaseAttachmentsParams>({
    page: 0,
    perPage: 5,
    caseId: caseData.id,
  });
  const { data: attachmentsData, isLoading } = useGetCaseAttachments(filteringOptions);

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
    queryClient.invalidateQueries(casesQueriesKeys.caseAttachments({ ...filteringOptions }));
  }, [filteringOptions, queryClient]);

  const pagination = useMemo(
    () => ({
      pageIndex: filteringOptions.page,
      pageSize: filteringOptions.perPage,
      totalItemCount: attachmentsData?.total ?? 0,
      pageSizeOptions: [1, 5, 10, 0],
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
                <AddFile caseId={caseData.id} onFileAdded={refreshAttachmentsTable} />
              </EuiFlexItem>
              <EuiFlexItem grow={false} style={{ minWidth: 400 }}>
                <EuiFieldSearch
                  fullWidth
                  placeholder="Search"
                  onSearch={onSearchChange}
                  incremental={false}
                  data-test-subj="case-detail-search-file"
                />
              </EuiFlexItem>
              <EuiFlexItem />
              <EuiFlexItem grow={false}>
                <EuiButtonGroup
                  legend="Text align"
                  options={toggleButtonsIcons}
                  idSelected={tableViewSelectedId}
                  onChange={() => {}}
                  hidden
                  isIconOnly
                />
              </EuiFlexItem>
            </EuiFlexGroup>
            <AttachmentsTable
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
CaseViewAttachments.displayName = 'CaseViewAttachments';
