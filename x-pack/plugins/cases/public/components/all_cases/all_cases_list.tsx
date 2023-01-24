/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import type { EuiBasicTable, EuiTableSelectionType } from '@elastic/eui';
import { EuiProgress } from '@elastic/eui';
import { difference, head, isEmpty } from 'lodash/fp';
import styled, { css } from 'styled-components';

import type { Case, CaseStatusWithAllStatus, FilterOptions } from '../../../common/ui/types';
import { SortFieldCase, StatusAll } from '../../../common/ui/types';
import { CaseStatuses, caseStatuses } from '../../../common/api';

import { useAvailableCasesOwners } from '../app/use_available_owners';
import { useCasesColumns } from './use_cases_columns';
import { CasesTableFilters } from './table_filters';
import type { EuiBasicTableOnChange } from './types';

import { CasesTable } from './table';
import { useCasesContext } from '../cases_context/use_cases_context';
import { CasesMetrics } from './cases_metrics';
import { useGetConnectors } from '../../containers/configure/use_connectors';
import { initialData, useGetCases } from '../../containers/use_get_cases';
import { useBulkGetUserProfiles } from '../../containers/user_profiles/use_bulk_get_user_profiles';
import { useGetCurrentUserProfile } from '../../containers/user_profiles/use_get_current_user_profile';
import { getAllPermissionsExceptFrom, isReadOnlyPermissions } from '../../utils/permissions';
import { useIsLoadingCases } from './use_is_loading_cases';
import { useAllCasesState } from './use_all_cases_state';

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
  // @ts-ignore
  SortFieldCase[field] ?? SortFieldCase.title;

export interface AllCasesListProps {
  hiddenStatuses?: CaseStatusWithAllStatus[];
  isSelectorView?: boolean;
  onRowClick?: (theCase?: Case) => void;
}

export const AllCasesList = React.memo<AllCasesListProps>(
  ({ hiddenStatuses = [], isSelectorView = false, onRowClick }) => {
    const { owner, permissions } = useCasesContext();
    const availableSolutions = useAvailableCasesOwners(getAllPermissionsExceptFrom('delete'));
    const isLoading = useIsLoadingCases();

    const hasOwner = !!owner.length;
    const firstAvailableStatus = head(difference(caseStatuses, hiddenStatuses));
    const initialFilterOptions = {
      ...(!isEmpty(hiddenStatuses) && firstAvailableStatus && { status: firstAvailableStatus }),
      owner: hasOwner ? owner : availableSolutions,
    };

    const { queryParams, setQueryParams, filterOptions, setFilterOptions } = useAllCasesState(
      isSelectorView,
      initialFilterOptions
    );
    const [selectedCases, setSelectedCases] = useState<Case[]>([]);

    const { data = initialData, isFetching: isLoadingCases } = useGetCases({
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
        sort: {
          field: queryParams.sortField,
          direction: queryParams.sortOrder,
        },
      }),
      [queryParams.sortField, queryParams.sortOrder]
    );

    const tableRef = useRef<EuiBasicTable | null>(null);

    const deselectCases = useCallback(() => {
      setSelectedCases([]);
      tableRef.current?.setSelection([]);
    }, [setSelectedCases]);

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
        deselectCases();
      },
      [queryParams, deselectCases, setQueryParams]
    );

    const onFilterChangedCallback = useCallback(
      (newFilterOptions: Partial<FilterOptions>) => {
        if (
          newFilterOptions?.status === CaseStatuses.closed &&
          queryParams.sortField === SortFieldCase.createdAt
        ) {
          setQueryParams({ sortField: SortFieldCase.closedAt });
        } else if (
          newFilterOptions.status &&
          [CaseStatuses.open, CaseStatuses['in-progress'], StatusAll].includes(
            newFilterOptions.status
          ) &&
          queryParams.sortField === SortFieldCase.closedAt
        ) {
          setQueryParams({ sortField: SortFieldCase.createdAt });
        }

        deselectCases();
        setFilterOptions({
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
        });
      },
      [
        queryParams.sortField,
        deselectCases,
        setFilterOptions,
        hasOwner,
        availableSolutions,
        owner,
        setQueryParams,
      ]
    );

    const { columns } = useCasesColumns({
      filterStatus: filterOptions.status ?? StatusAll,
      userProfiles: userProfiles ?? new Map(),
      isSelectorView,
      connectors,
      onRowClick,
      showSolutionColumn: !hasOwner && availableSolutions.length > 1,
      disableActions: selectedCases.length > 0,
    });

    const pagination = useMemo(
      () => ({
        pageIndex: queryParams.page - 1,
        pageSize: queryParams.perPage,
        totalItemCount: data.total ?? 0,
        pageSizeOptions: [10, 25, 50, 100],
      }),
      [data, queryParams]
    );

    const euiBasicTableSelectionProps = useMemo<EuiTableSelectionType<Case>>(
      () => ({
        onSelectionChange: setSelectedCases,
        initialSelected: selectedCases,
        selectable: () => !isReadOnlyPermissions(permissions),
      }),
      [permissions, selectedCases]
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
        {!isSelectorView ? <CasesMetrics /> : null}
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
          hiddenStatuses={hiddenStatuses}
          displayCreateCaseButton={isSelectorView}
          onCreateCasePressed={onRowClick}
          isLoading={isLoadingCurrentUserProfile}
          currentUserProfile={currentUserProfile}
        />
        <CasesTable
          columns={columns}
          data={data}
          goToCreateCase={onRowClick}
          isCasesLoading={isLoadingCases}
          isCommentUpdating={isLoadingCases}
          isDataEmpty={isDataEmpty}
          isSelectorView={isSelectorView}
          onChange={tableOnChangeCallback}
          pagination={pagination}
          selectedCases={selectedCases}
          selection={euiBasicTableSelectionProps}
          sorting={sorting}
          tableRef={tableRef}
          tableRowProps={tableRowProps}
          deselectCases={deselectCases}
        />
      </>
    );
  }
);

AllCasesList.displayName = 'AllCasesList';
