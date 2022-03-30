/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { EuiProgress, EuiBasicTable, EuiTableSelectionType } from '@elastic/eui';
import { difference, head, isEmpty } from 'lodash/fp';
import styled, { css } from 'styled-components';

import {
  Case,
  CaseStatusWithAllStatus,
  FilterOptions,
  SortFieldCase,
} from '../../../common/ui/types';
import { CaseStatuses, caseStatuses } from '../../../common/api';
import { useGetCases } from '../../containers/use_get_cases';
import { usePostComment } from '../../containers/use_post_comment';

import { useAvailableCasesOwners } from '../app/use_available_owners';
import { useCasesColumns } from './columns';
import { CasesTableFilters } from './table_filters';
import { EuiBasicTableOnChange } from './types';

import { CasesTable } from './table';
import { useConnectors } from '../../containers/configure/use_connectors';
import { useCasesContext } from '../cases_context/use_cases_context';
import { CaseAttachments } from '../../types';

const ProgressLoader = styled(EuiProgress)`
  ${({ $isShow }: { $isShow: boolean }) =>
    $isShow
      ? css`
          top: 2px;
          border-radius: ${({ theme }) => theme.eui.euiBorderRadius};
          z-index: ${({ theme }) => theme.eui.euiZHeader};
        `
      : `
      display: none;
    `}
`;

const getSortField = (field: string): SortFieldCase =>
  field === SortFieldCase.closedAt ? SortFieldCase.closedAt : SortFieldCase.createdAt;

export interface AllCasesListProps {
  /**
   * @deprecated Use the attachments prop instead
   */
  hiddenStatuses?: CaseStatusWithAllStatus[];
  isSelectorView?: boolean;
  onRowClick?: (theCase?: Case) => void;
  updateCase?: (newCase: Case) => void;
  doRefresh?: () => void;
  attachments?: CaseAttachments;
}

export const AllCasesList = React.memo<AllCasesListProps>(
  ({
    attachments,
    hiddenStatuses = [],
    isSelectorView = false,
    onRowClick,
    updateCase,
    doRefresh,
  }) => {
    const { owner, userCanCrud } = useCasesContext();
    const hasOwner = !!owner.length;
    const availableSolutions = useAvailableCasesOwners();

    const firstAvailableStatus = head(difference(caseStatuses, hiddenStatuses));
    const initialFilterOptions = {
      ...(!isEmpty(hiddenStatuses) && firstAvailableStatus && { status: firstAvailableStatus }),
      owner: hasOwner ? owner : availableSolutions,
    };

    const {
      data,
      dispatchUpdateCaseProperty,
      filterOptions,
      loading,
      queryParams,
      selectedCases,
      refetchCases,
      setFilters,
      setQueryParams,
      setSelectedCases,
    } = useGetCases({ initialFilterOptions });

    // Post Comment to Case
    const { postComment, isLoading: isCommentUpdating } = usePostComment();
    const { connectors } = useConnectors();

    const sorting = useMemo(
      () => ({
        sort: { field: queryParams.sortField, direction: queryParams.sortOrder },
      }),
      [queryParams.sortField, queryParams.sortOrder]
    );

    const filterRefetch = useRef<() => void>();
    const tableRef = useRef<EuiBasicTable | null>(null);
    const [isLoading, handleIsLoading] = useState<boolean>(false);

    const setFilterRefetch = useCallback(
      (refetchFilter: () => void) => {
        filterRefetch.current = refetchFilter;
      },
      [filterRefetch]
    );

    const deselectCases = useCallback(() => {
      setSelectedCases([]);
      tableRef.current?.setSelection([]);
    }, [setSelectedCases]);

    const refreshCases = useCallback(
      (dataRefresh = true) => {
        deselectCases();
        if (dataRefresh) refetchCases();
        if (doRefresh) doRefresh();
        if (filterRefetch.current != null) {
          filterRefetch.current();
        }
      },
      [deselectCases, doRefresh, refetchCases]
    );

    const tableOnChangeCallback = useCallback(
      ({ page, sort }: EuiBasicTableOnChange) => {
        let newQueryParams = queryParams;
        if (sort) {
          newQueryParams = {
            ...newQueryParams,
            sortField: getSortField(sort.field),
            sortOrder: sort.direction,
          };
        }
        if (page) {
          newQueryParams = {
            ...newQueryParams,
            page: page.index + 1,
            perPage: page.size,
          };
        }
        setQueryParams(newQueryParams);
        refreshCases(false);
      },
      [queryParams, refreshCases, setQueryParams]
    );

    const onFilterChangedCallback = useCallback(
      (newFilterOptions: Partial<FilterOptions>) => {
        if (newFilterOptions.status && newFilterOptions.status === CaseStatuses.closed) {
          setQueryParams({ sortField: SortFieldCase.closedAt });
        } else if (newFilterOptions.status && newFilterOptions.status === CaseStatuses.open) {
          setQueryParams({ sortField: SortFieldCase.createdAt });
        } else if (
          newFilterOptions.status &&
          newFilterOptions.status === CaseStatuses['in-progress']
        ) {
          setQueryParams({ sortField: SortFieldCase.createdAt });
        }

        deselectCases();
        setFilters(newFilterOptions);
        refreshCases(false);
      },
      [deselectCases, setFilters, refreshCases, setQueryParams]
    );

    const showActions = userCanCrud && !isSelectorView;

    const toAttach = attachments ?? [];

    const columns = useCasesColumns({
      dispatchUpdateCaseProperty,
      filterStatus: filterOptions.status,
      handleIsLoading,
      isLoadingCases: loading,
      refreshCases,
      isSelectorView,
      userCanCrud,
      connectors,
      onRowClick,
      attachments: toAttach,
      postComment,
      updateCase,
      showSolutionColumn: !hasOwner && availableSolutions.length > 1,
    });

    const pagination = useMemo(
      () => ({
        pageIndex: queryParams.page - 1,
        pageSize: queryParams.perPage,
        totalItemCount: data.total,
        pageSizeOptions: [5, 10, 15, 20, 25],
      }),
      [data, queryParams]
    );

    const euiBasicTableSelectionProps = useMemo<EuiTableSelectionType<Case>>(
      () => ({
        onSelectionChange: setSelectedCases,
        initialSelected: selectedCases,
      }),
      [selectedCases, setSelectedCases]
    );
    const isCasesLoading = useMemo(() => loading.indexOf('cases') > -1, [loading]);
    const isDataEmpty = useMemo(() => data.total === 0, [data]);

    const tableRowProps = useCallback(
      (theCase: Case) => ({
        'data-test-subj': `cases-table-row-${theCase.id}`,
      }),
      []
    );

    return (
      <>
        <ProgressLoader
          size="xs"
          color="accent"
          className="essentialAnimation"
          $isShow={(isCasesLoading || isLoading || isCommentUpdating) && !isDataEmpty}
        />
        <CasesTableFilters
          countClosedCases={data.countClosedCases}
          countOpenCases={data.countOpenCases}
          countInProgressCases={data.countInProgressCases}
          onFilterChanged={onFilterChangedCallback}
          availableSolutions={hasOwner ? [] : availableSolutions}
          initial={{
            search: filterOptions.search,
            reporters: filterOptions.reporters,
            tags: filterOptions.tags,
            status: filterOptions.status,
            owner: filterOptions.owner,
          }}
          setFilterRefetch={setFilterRefetch}
          hiddenStatuses={hiddenStatuses}
        />
        <CasesTable
          columns={columns}
          data={data}
          filterOptions={filterOptions}
          goToCreateCase={onRowClick}
          handleIsLoading={handleIsLoading}
          isCasesLoading={isCasesLoading}
          isCommentUpdating={isCommentUpdating}
          isDataEmpty={isDataEmpty}
          isSelectorView={isSelectorView}
          onChange={tableOnChangeCallback}
          pagination={pagination}
          refreshCases={refreshCases}
          selectedCases={selectedCases}
          selection={euiBasicTableSelectionProps}
          showActions={showActions}
          sorting={sorting}
          tableRef={tableRef}
          tableRowProps={tableRowProps}
          userCanCrud={userCanCrud}
        />
      </>
    );
  }
);

AllCasesList.displayName = 'AllCasesList';
