/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { EuiProgress, EuiBasicTable, EuiTableSelectionType } from '@elastic/eui';
import { difference, head, isEmpty, memoize } from 'lodash/fp';
import styled, { css } from 'styled-components';
import classnames from 'classnames';

import {
  Case,
  CaseStatuses,
  CaseType,
  CommentRequestAlertType,
  CaseStatusWithAllStatus,
  CommentType,
  FilterOptions,
  SortFieldCase,
  SubCase,
  caseStatuses,
} from '../../../common';
import { SELECTABLE_MESSAGE_COLLECTIONS } from '../../common/translations';
import { useGetActionLicense } from '../../containers/use_get_action_license';
import { useGetCases } from '../../containers/use_get_cases';
import { usePostComment } from '../../containers/use_post_comment';
import { CaseDetailsHrefSchema, CasesNavigation } from '../links';
import { Panel } from '../panel';
import { getActionLicenseError } from '../use_push_to_service/helpers';
import { useCasesColumns } from './columns';
import { getExpandedRowMap } from './expanded_row';
import { CasesTableHeader } from './header';
import { CasesTableFilters } from './table_filters';
import { EuiBasicTableOnChange } from './types';

import { CasesTable } from './table';
import { useConnectors } from '../../containers/configure/use_connectors';

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

interface AllCasesGenericProps {
  alertData?: Omit<CommentRequestAlertType, 'type'>;
  caseDetailsNavigation?: CasesNavigation<CaseDetailsHrefSchema, 'configurable'>; // if not passed, case name is not displayed as a link (Formerly dependant on isSelectorView)
  configureCasesNavigation?: CasesNavigation; // if not passed, header with nav is not displayed (Formerly dependant on isSelectorView)
  createCaseNavigation: CasesNavigation;
  disableAlerts?: boolean;
  hiddenStatuses?: CaseStatusWithAllStatus[];
  isSelectorView?: boolean;
  onRowClick?: (theCase?: Case | SubCase) => void;
  showTitle?: boolean;
  updateCase?: (newCase: Case) => void;
  userCanCrud: boolean;
}

export const AllCasesGeneric = React.memo<AllCasesGenericProps>(
  ({
    alertData,
    caseDetailsNavigation,
    configureCasesNavigation,
    createCaseNavigation,
    disableAlerts,
    hiddenStatuses = [],
    isSelectorView,
    onRowClick,
    showTitle,
    updateCase,
    userCanCrud,
  }) => {
    const { actionLicense } = useGetActionLicense();

    const firstAvailableStatus = head(difference(caseStatuses, hiddenStatuses));
    const initialFilterOptions =
      !isEmpty(hiddenStatuses) && firstAvailableStatus ? { status: firstAvailableStatus } : {};

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
    const { connectors } = useConnectors({ toastPermissionsErrors: false });

    const sorting = useMemo(
      () => ({
        sort: { field: queryParams.sortField, direction: queryParams.sortOrder },
      }),
      [queryParams.sortField, queryParams.sortOrder]
    );

    const filterRefetch = useRef<() => void>();
    const tableRef = useRef<EuiBasicTable>();
    const setFilterRefetch = useCallback(
      (refetchFilter: () => void) => {
        filterRefetch.current = refetchFilter;
      },
      [filterRefetch]
    );
    const [refresh, doRefresh] = useState<number>(0);
    const [isLoading, handleIsLoading] = useState<boolean>(false);
    const refreshCases = useCallback(
      (dataRefresh = true) => {
        if (dataRefresh) refetchCases();
        doRefresh((prev) => prev + 1);
        setSelectedCases([]);
        if (filterRefetch.current != null) {
          filterRefetch.current();
        }
      },
      [filterRefetch, refetchCases, setSelectedCases]
    );

    const { onClick: onCreateCaseNavClick } = createCaseNavigation;
    const goToCreateCase = useCallback(
      (ev) => {
        ev.preventDefault();
        if (isSelectorView && onRowClick != null) {
          onRowClick();
        } else if (onCreateCaseNavClick) {
          onCreateCaseNavClick(ev);
        }
      },
      [isSelectorView, onCreateCaseNavClick, onRowClick]
    );
    const actionsErrors = useMemo(() => getActionLicenseError(actionLicense), [actionLicense]);

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

        setSelectedCases([]);
        tableRef.current?.setSelection([]);
        setFilters(newFilterOptions);
        refreshCases(false);
      },
      [setSelectedCases, setFilters, refreshCases, setQueryParams]
    );

    const showActions = userCanCrud && !isSelectorView;

    const columns = useCasesColumns({
      caseDetailsNavigation,
      disableAlerts,
      dispatchUpdateCaseProperty,
      filterStatus: filterOptions.status,
      handleIsLoading,
      isLoadingCases: loading,
      refreshCases,
      // isSelectorView is boolean | undefined. We need to convert it to a boolean.
      isSelectorView: !!isSelectorView,
      userCanCrud,
      connectors,
    });

    const itemIdToExpandedRowMap = useMemo(
      () =>
        getExpandedRowMap({
          columns,
          data: data.cases,
          onSubCaseClick: onRowClick,
        }),
      [data.cases, columns, onRowClick]
    );

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
        selectableMessage: (selectable) => (!selectable ? SELECTABLE_MESSAGE_COLLECTIONS : ''),
        initialSelected: selectedCases,
      }),
      [selectedCases, setSelectedCases]
    );
    const isCasesLoading = useMemo(() => loading.indexOf('cases') > -1, [loading]);
    const isDataEmpty = useMemo(() => data.total === 0, [data]);

    const TableWrap = useMemo(() => (isSelectorView ? 'span' : Panel), [isSelectorView]);

    const tableRowProps = useCallback(
      (theCase: Case) => {
        const onTableRowClick = memoize(async () => {
          if (alertData != null) {
            await postComment({
              caseId: theCase.id,
              data: {
                type: CommentType.alert,
                ...alertData,
              },
              updateCase,
            });
          }
          if (onRowClick) {
            onRowClick(theCase);
          }
        });

        return {
          'data-test-subj': `cases-table-row-${theCase.id}`,
          className: classnames({ isDisabled: theCase.type === CaseType.collection }),
          ...(isSelectorView && theCase.type !== CaseType.collection
            ? { onClick: onTableRowClick }
            : {}),
        };
      },
      [isSelectorView, alertData, onRowClick, postComment, updateCase]
    );

    return (
      <>
        {configureCasesNavigation != null && (
          <CasesTableHeader
            actionsErrors={actionsErrors}
            createCaseNavigation={createCaseNavigation}
            configureCasesNavigation={configureCasesNavigation}
            refresh={refresh}
            showTitle={showTitle}
            userCanCrud={userCanCrud}
          />
        )}
        <ProgressLoader
          size="xs"
          color="accent"
          className="essentialAnimation"
          $isShow={(isCasesLoading || isLoading || isCommentUpdating) && !isDataEmpty}
        />
        <TableWrap
          data-test-subj="table-wrap"
          loading={!isSelectorView ? isCasesLoading : undefined}
        >
          <CasesTableFilters
            countClosedCases={data.countClosedCases}
            countOpenCases={data.countOpenCases}
            countInProgressCases={data.countInProgressCases}
            onFilterChanged={onFilterChangedCallback}
            initial={{
              search: filterOptions.search,
              reporters: filterOptions.reporters,
              tags: filterOptions.tags,
              status: filterOptions.status,
            }}
            setFilterRefetch={setFilterRefetch}
            hiddenStatuses={hiddenStatuses}
          />
          <CasesTable
            columns={columns}
            createCaseNavigation={createCaseNavigation}
            data={data}
            filterOptions={filterOptions}
            goToCreateCase={goToCreateCase}
            handleIsLoading={handleIsLoading}
            isCasesLoading={isCasesLoading}
            isCommentUpdating={isCommentUpdating}
            isDataEmpty={isDataEmpty}
            isSelectorView={isSelectorView}
            itemIdToExpandedRowMap={itemIdToExpandedRowMap}
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
        </TableWrap>
      </>
    );
  }
);

AllCasesGeneric.displayName = 'AllCasesGeneric';
