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

import { useQueryClient } from '@tanstack/react-query';
import {
  Case,
  CaseStatusWithAllStatus,
  FilterOptions,
  QueryParams,
  SortFieldCase,
  StatusAll,
} from '../../../common/ui/types';
import { CaseStatuses, caseStatuses } from '../../../common/api';

import { useAvailableCasesOwners } from '../app/use_available_owners';
import { useCasesColumns } from './columns';
import { CasesTableFilters } from './table_filters';
import { EuiBasicTableOnChange } from './types';

import { CasesTable } from './table';
import { useCasesContext } from '../cases_context/use_cases_context';
import { CasesMetrics } from './cases_metrics';
import { useGetConnectors } from '../../containers/configure/use_connectors';
import {
  DEFAULT_FILTER_OPTIONS,
  DEFAULT_QUERY_PARAMS,
  initialData,
  useGetCases,
} from '../../containers/use_get_cases';
import { useBulkGetUserProfiles } from '../../containers/user_profiles/use_bulk_get_user_profiles';
import { useGetCurrentUserProfile } from '../../containers/user_profiles/use_get_current_user_profile';
import {
  USER_PROFILES_BULK_GET_CACHE_KEY,
  USER_PROFILES_CACHE_KEY,
} from '../../containers/constants';
import { getAllPermissionsExceptFrom } from '../../utils/permissions';

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
  hiddenStatuses?: CaseStatusWithAllStatus[];
  isSelectorView?: boolean;
  onRowClick?: (theCase?: Case) => void;
  doRefresh?: () => void;
}

export const AllCasesList = React.memo<AllCasesListProps>(
  ({ hiddenStatuses = [], isSelectorView = false, onRowClick, doRefresh }) => {
    const { owner, permissions } = useCasesContext();
    const availableSolutions = useAvailableCasesOwners(getAllPermissionsExceptFrom('delete'));
    const [refresh, setRefresh] = useState(0);

    const hasOwner = !!owner.length;

    const firstAvailableStatus = head(difference(caseStatuses, hiddenStatuses));
    const initialFilterOptions = {
      ...(!isEmpty(hiddenStatuses) && firstAvailableStatus && { status: firstAvailableStatus }),
      owner: hasOwner ? owner : availableSolutions,
    };
    const [filterOptions, setFilterOptions] = useState<FilterOptions>({
      ...DEFAULT_FILTER_OPTIONS,
      ...initialFilterOptions,
    });
    const [queryParams, setQueryParams] = useState<QueryParams>(DEFAULT_QUERY_PARAMS);
    const [selectedCases, setSelectedCases] = useState<Case[]>([]);
    const queryClient = useQueryClient();

    const {
      data = initialData,
      isFetching: isLoadingCases,
      refetch: refetchCases,
    } = useGetCases({
      filterOptions,
      queryParams,
    });

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

    const { data: currentUserProfile, isLoading: isLoadingCurrentUserProfile } =
      useGetCurrentUserProfile();

    const { data: connectors = [] } = useGetConnectors();

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
        if (dataRefresh) {
          refetchCases();
          queryClient.refetchQueries([USER_PROFILES_CACHE_KEY, USER_PROFILES_BULK_GET_CACHE_KEY]);

          setRefresh((currRefresh: number) => currRefresh + 1);
        }
        if (doRefresh) {
          doRefresh();
        }
        if (filterRefetch.current != null) {
          filterRefetch.current();
        }
      },
      [deselectCases, doRefresh, queryClient, refetchCases]
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
          setQueryParams((prevQueryParams) => ({
            ...prevQueryParams,
            sortField: SortFieldCase.closedAt,
          }));
        } else if (newFilterOptions.status && newFilterOptions.status === CaseStatuses.open) {
          setQueryParams((prevQueryParams) => ({
            ...prevQueryParams,
            sortField: SortFieldCase.createdAt,
          }));
        } else if (
          newFilterOptions.status &&
          newFilterOptions.status === CaseStatuses['in-progress']
        ) {
          setQueryParams((prevQueryParams) => ({
            ...prevQueryParams,
            sortField: SortFieldCase.createdAt,
          }));
        }

        deselectCases();
        setFilterOptions((prevFilterOptions) => ({
          ...prevFilterOptions,
          ...newFilterOptions,
          /**
           * If the user selects and deselects all solutions
           * then the owner is set to an empty array. This results in fetching all cases the user has access to including
           * the ones with read access. We want to show only the cases the user has full access to.
           * For that reason we fallback to availableSolutions if the owner is empty.
           *
           * If the consumer of cases has passed an owner we fallback to the provided owner
           */
          ...(newFilterOptions.owner != null && !hasOwner
            ? {
                owner:
                  newFilterOptions.owner.length === 0 ? availableSolutions : newFilterOptions.owner,
              }
            : newFilterOptions.owner != null && hasOwner
            ? {
                owner: newFilterOptions.owner.length === 0 ? owner : newFilterOptions.owner,
              }
            : {}),
        }));
        refreshCases(false);
      },
      [deselectCases, refreshCases, hasOwner, availableSolutions, owner]
    );

    /**
     * At the time of changing this from all to delete the only bulk action we have is to delete. When we add more
     * actions we'll need to revisit this to allow more granular checks around the bulk actions.
     */
    const showActions = permissions.delete && !isSelectorView;

    const columns = useCasesColumns({
      filterStatus: filterOptions.status ?? StatusAll,
      userProfiles: userProfiles ?? new Map(),
      currentUserProfile,
      handleIsLoading,
      refreshCases,
      isSelectorView,
      connectors,
      onRowClick,
      showSolutionColumn: !hasOwner && availableSolutions.length > 1,
    });

    const pagination = useMemo(
      () => ({
        pageIndex: (queryParams?.page ?? DEFAULT_QUERY_PARAMS.page) - 1,
        pageSize: queryParams?.perPage ?? DEFAULT_QUERY_PARAMS.perPage,
        totalItemCount: data.total ?? 0,
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
          $isShow={isLoading || isLoadingCases}
        />
        {!isSelectorView ? <CasesMetrics refresh={refresh} /> : null}
        <CasesTableFilters
          countClosedCases={data.countClosedCases}
          countOpenCases={data.countOpenCases}
          countInProgressCases={data.countInProgressCases}
          onFilterChanged={onFilterChangedCallback}
          availableSolutions={hasOwner ? [] : availableSolutions}
          initial={{
            search: filterOptions.search,
            searchFields: filterOptions.searchFields,
            assignees: filterOptions.assignees,
            reporters: filterOptions.reporters,
            tags: filterOptions.tags,
            status: filterOptions.status,
            owner: filterOptions.owner,
            severity: filterOptions.severity,
          }}
          setFilterRefetch={setFilterRefetch}
          hiddenStatuses={hiddenStatuses}
          displayCreateCaseButton={isSelectorView}
          onCreateCasePressed={onRowClick}
          isLoading={isLoadingCurrentUserProfile}
          currentUserProfile={currentUserProfile}
        />
        <CasesTable
          columns={columns}
          data={data}
          filterOptions={filterOptions}
          goToCreateCase={onRowClick}
          handleIsLoading={handleIsLoading}
          isCasesLoading={isLoadingCases}
          isCommentUpdating={isLoadingCases}
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
        />
      </>
    );
  }
);

AllCasesList.displayName = 'AllCasesList';
