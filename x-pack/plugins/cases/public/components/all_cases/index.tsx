/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiBasicTable as _EuiBasicTable,
  EuiEmptyPrompt,
  EuiLoadingContent,
  EuiProgress,
  EuiTableSortingType,
} from '@elastic/eui';
import { EuiTableSelectionType } from '@elastic/eui/src/components/basic_table/table_types';
import { isEmpty, memoize } from 'lodash/fp';
import styled, { css } from 'styled-components';
import classnames from 'classnames';

import * as i18n from './translations';
import { CaseStatuses, CaseType, CommentRequestAlertType, CommentType } from '../../../common';
import { getCasesColumns } from './columns';
import { Case, DeleteCase, FilterOptions, SortFieldCase, SubCase } from '../../containers/types';
import { useGetCases, UpdateCase } from '../../containers/use_get_cases';
import { useDeleteCases } from '../../containers/use_delete_cases';
import { EuiBasicTableOnChange } from './types';
import { Panel } from '../panel';

import { ConfirmDeleteCaseModal } from '../confirm_delete_case';
import { getActions } from './actions';
import { CasesTableFilters } from './table_filters';
import { useUpdateCases } from '../../containers/use_bulk_update_case';
import { useGetActionLicense } from '../../containers/use_get_action_license';
import { usePostComment } from '../../containers/use_post_comment';
import { getActionLicenseError } from '../use_push_to_service/helpers';
import { CaseCallOut } from '../callout';
import { ERROR_PUSH_SERVICE_CALLOUT_TITLE } from '../use_push_to_service/translations';
import { CaseDetailsHrefSchema, CasesNavigation, LinkButton } from '../links';
import { SELECTABLE_MESSAGE_COLLECTIONS } from '../../common/translations';
import { getExpandedRowMap } from './expanded_row';
import { AllCasesFilters } from './filters';
import { AllCasesHeader } from './header';

const Div = styled.div`
  margin-top: ${({ theme }) => theme.eui.paddingSizes.m};
`;

const ProgressLoader = styled(EuiProgress)`
  ${({ theme }) => css`
    top: 2px;
    border-radius: ${theme.eui.euiBorderRadius};
    z-index: ${theme.eui.euiZHeader};
  `}
`;

const getSortField = (field: string): SortFieldCase => {
  if (field === SortFieldCase.createdAt) {
    return SortFieldCase.createdAt;
  } else if (field === SortFieldCase.closedAt) {
    return SortFieldCase.closedAt;
  }
  return SortFieldCase.createdAt;
};

const EuiBasicTable: any = _EuiBasicTable;
const BasicTable = styled(EuiBasicTable)`
  ${({ theme }) => `
    .euiTableRow-isExpandedRow.euiTableRow-isSelectable .euiTableCellContent {
      padding: 8px 0 8px 32px;
    }

    &.isModal .euiTableRow.isDisabled {
      cursor: not-allowed;
      background-color: ${theme.eui.euiTableHoverClickableColor};
    }

    &.isModal .euiTableRow.euiTableRow-isExpandedRow .euiTableRowCell,
    &.isModal .euiTableRow.euiTableRow-isExpandedRow:hover {
      background-color: transparent;
    }

    &.isModal .euiTableRow.euiTableRow-isExpandedRow {
      .subCase:hover {
        background-color: ${theme.eui.euiTableHoverClickableColor};
      }
    }
  `}
`;
BasicTable.displayName = 'BasicTable';

export interface AllCasesProps {
  alertData?: Omit<CommentRequestAlertType, 'type'>;
  caseDetailsNavigation: CasesNavigation<CaseDetailsHrefSchema, 'configurable'>;
  configureCasesNavigation: CasesNavigation;
  createCaseNavigation: CasesNavigation;
  disabledStatuses?: CaseStatuses[];
  isModal?: boolean;
  onRowClick?: (theCase?: Case | SubCase) => void;
  userCanCrud: boolean;
  updateCase?: (newCase: Case) => void;
}

export const AllCases = React.memo<AllCasesProps>(
  ({
    alertData,
    caseDetailsNavigation,
    configureCasesNavigation,
    createCaseNavigation,
    disabledStatuses,
    isModal = false,
    onRowClick,
    userCanCrud,
    updateCase,
  }) => {
    const { actionLicense } = useGetActionLicense();
    const [refresh, doRefresh] = useState(0);
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
    } = useGetCases();

    // Delete case
    const {
      dispatchResetIsDeleted,
      handleOnDeleteConfirm,
      handleToggleModal,
      isLoading: isDeletingSingleCase,
      isDeleted: isDeletedSingleCase,
      isDisplayConfirmDeleteModal,
    } = useDeleteCases();

    // Update case
    const {
      dispatchResetIsUpdated,
      isLoading: isUpdatingSingleCase,
      isUpdated: isUpdatedSingleCase,
    } = useUpdateCases();

    // Post Comment to Case
    const { postComment, isLoading: isCommentsUpdating } = usePostComment();

    const [isDeleting, setIsDeleting] = useState<boolean>(false);
    const [isUpdating, setIsUpdating] = useState<boolean>(false);
    const [deleteThisCase, setDeleteThisCase] = useState<DeleteCase>({
      title: '',
      id: '',
      type: null,
    });
    const [deleteBulk, setDeleteBulk] = useState<DeleteCase[]>([]);
    const filterRefetch = useRef<() => void>();
    const setFilterRefetch = useCallback(
      (refetchFilter: () => void) => {
        filterRefetch.current = refetchFilter;
      },
      [filterRefetch]
    );
    const refreshCases = useCallback(
      (dataRefresh = true) => {
        if (dataRefresh) refetchCases();
        doRefresh((prev) => prev + 1);
        setSelectedCases([]);
        setDeleteBulk([]);
        if (filterRefetch.current != null) {
          filterRefetch.current();
        }
      },
      [filterRefetch, refetchCases, setSelectedCases]
    );
    const confirmDeleteModal = useMemo(
      () => (
        <ConfirmDeleteCaseModal
          caseTitle={deleteThisCase.title}
          isModalVisible={isDisplayConfirmDeleteModal}
          isPlural={deleteBulk.length > 0}
          onCancel={handleToggleModal}
          onConfirm={handleOnDeleteConfirm.bind(
            null,
            deleteBulk.length > 0 ? deleteBulk : [deleteThisCase]
          )}
        />
      ),
      [
        deleteBulk,
        deleteThisCase,
        isDisplayConfirmDeleteModal,
        handleToggleModal,
        handleOnDeleteConfirm,
      ]
    );
    useEffect(() => {
      if (isDeletedSingleCase) {
        refreshCases();
        dispatchResetIsDeleted();
      }
      if (isUpdatedSingleCase) {
        refreshCases();
        dispatchResetIsUpdated();
      }
    }, [
      dispatchResetIsDeleted,
      dispatchResetIsUpdated,
      isDeletedSingleCase,
      isUpdatedSingleCase,
      refreshCases,
    ]);

    const toggleDeleteModal = useCallback(
      (deleteCase: Case) => {
        handleToggleModal();
        setDeleteThisCase({ id: deleteCase.id, title: deleteCase.title, type: deleteCase.type });
      },
      [handleToggleModal]
    );

    const handleDispatchUpdate = useCallback(
      (args: Omit<UpdateCase, 'refetchCasesStatus'>) => {
        dispatchUpdateCaseProperty({
          ...args,
          refetchCasesStatus: () => doRefresh((prev) => prev + 1),
        });
      },
      [dispatchUpdateCaseProperty, doRefresh]
    );

    const { onClick: onCreateCaseNavClick } = createCaseNavigation;
    const goToCreateCase = useCallback(
      (ev) => {
        ev.preventDefault();
        if (isModal && onRowClick != null) {
          onRowClick();
        } else if (onCreateCaseNavClick) {
          onCreateCaseNavClick(ev);
        }
      },
      [isModal, onCreateCaseNavClick, onRowClick]
    );

    const actions = useMemo(
      () =>
        getActions({
          deleteCaseOnClick: toggleDeleteModal,
          dispatchUpdate: handleDispatchUpdate,
        }),
      [toggleDeleteModal, handleDispatchUpdate]
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
        setFilters(newFilterOptions);
        refreshCases(false);
      },
      [refreshCases, setQueryParams, setFilters]
    );

    const memoizedGetCasesColumns = useMemo(
      () =>
        getCasesColumns({
          actions: userCanCrud ? actions : [],
          caseDetailsNavigation,
          filterStatus: filterOptions.status,
          isModal,
        }),
      [actions, caseDetailsNavigation, filterOptions.status, isModal, userCanCrud]
    );

    const itemIdToExpandedRowMap = useMemo(
      () =>
        getExpandedRowMap({
          columns: memoizedGetCasesColumns,
          data: data.cases,
          isModal,
          onSubCaseClick: onRowClick,
        }),
      [data.cases, isModal, memoizedGetCasesColumns, onRowClick]
    );

    const memoizedPagination = useMemo(
      () => ({
        pageIndex: queryParams.page - 1,
        pageSize: queryParams.perPage,
        totalItemCount: data.total,
        pageSizeOptions: [5, 10, 15, 20, 25],
      }),
      [data, queryParams]
    );

    const sorting: EuiTableSortingType<Case> = {
      sort: { field: queryParams.sortField, direction: queryParams.sortOrder },
    };

    const euiBasicTableSelectionProps = useMemo<EuiTableSelectionType<Case>>(
      () => ({
        onSelectionChange: setSelectedCases,
        selectableMessage: (selectable) => (!selectable ? SELECTABLE_MESSAGE_COLLECTIONS : ''),
      }),
      [setSelectedCases]
    );
    const isCasesLoading = useMemo(
      () => loading.indexOf('cases') > -1 || loading.indexOf('caseUpdate') > -1,
      [loading]
    );
    const isDataEmpty = useMemo(() => data.total === 0, [data]);

    const TableWrap = useMemo(() => (isModal ? 'span' : Panel), [isModal]);

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
          ...(isModal && theCase.type !== CaseType.collection ? { onClick: onTableRowClick } : {}),
        };
      },
      [isModal, alertData, onRowClick, postComment, updateCase]
    );

    const enableBulkActions = userCanCrud && !isModal;

    return (
      <>
        {!isEmpty(actionsErrors) && (
          <CaseCallOut title={ERROR_PUSH_SERVICE_CALLOUT_TITLE} messages={actionsErrors} />
        )}
        {!isModal && (
          <AllCasesHeader
            actionsErrors={actionsErrors}
            createCaseNavigation={createCaseNavigation}
            configureCasesNavigation={configureCasesNavigation}
            refresh={refresh}
            userCanCrud={userCanCrud}
          />
        )}
        {(isCasesLoading ||
          isDeleting ||
          isDeletingSingleCase ||
          isUpdatingSingleCase ||
          isUpdating ||
          isCommentsUpdating) &&
          !isDataEmpty && (
            <ProgressLoader size="xs" color="accent" className="essentialAnimation" />
          )}
        <TableWrap data-test-subj="table-wrap" loading={!isModal ? isCasesLoading : undefined}>
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
            disabledStatuses={disabledStatuses}
          />
          {isCasesLoading && isDataEmpty ? (
            <Div>
              <EuiLoadingContent data-test-subj="initialLoadingPanelAllCases" lines={10} />
            </Div>
          ) : (
            <Div>
              <AllCasesFilters
                data={data}
                enableBulkActions={enableBulkActions}
                filterOptions={filterOptions}
                handleIsDeleting={setIsDeleting}
                handleIsUpdating={setIsUpdating}
                selectedCases={selectedCases}
                refreshCases={refreshCases}
              />
              <BasicTable
                columns={memoizedGetCasesColumns}
                data-test-subj="cases-table"
                isSelectable={enableBulkActions}
                itemId="id"
                items={data.cases}
                itemIdToExpandedRowMap={itemIdToExpandedRowMap}
                loading={isCommentsUpdating}
                noItemsMessage={
                  <EuiEmptyPrompt
                    title={<h3>{i18n.NO_CASES}</h3>}
                    titleSize="xs"
                    body={i18n.NO_CASES_BODY}
                    actions={
                      <LinkButton
                        isDisabled={!userCanCrud}
                        fill
                        size="s"
                        onClick={goToCreateCase}
                        href={createCaseNavigation.href}
                        iconType="plusInCircle"
                        data-test-subj="cases-table-add-case"
                      >
                        {i18n.ADD_NEW_CASE}
                      </LinkButton>
                    }
                  />
                }
                onChange={tableOnChangeCallback}
                pagination={memoizedPagination}
                rowProps={tableRowProps}
                selection={enableBulkActions ? euiBasicTableSelectionProps : undefined}
                sorting={sorting}
                className={classnames({ isModal })}
              />
            </Div>
          )}
        </TableWrap>
        {confirmDeleteModal}
      </>
    );
  }
);

AllCases.displayName = 'AllCases';

// eslint-disable-next-line import/no-default-export
export { AllCases as default };
