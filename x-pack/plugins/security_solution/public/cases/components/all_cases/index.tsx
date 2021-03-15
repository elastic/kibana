/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiBasicTable as _EuiBasicTable,
  EuiContextMenuPanel,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingContent,
  EuiProgress,
  EuiTableSortingType,
} from '@elastic/eui';
import { EuiTableSelectionType } from '@elastic/eui/src/components/basic_table/table_types';
import { isEmpty, memoize } from 'lodash/fp';
import styled, { css } from 'styled-components';
import classnames from 'classnames';

import * as i18n from './translations';
import { CaseStatuses, CaseType } from '../../../../../cases/common/api';
import { getCasesColumns } from './columns';
import { Case, DeleteCase, FilterOptions, SortFieldCase, SubCase } from '../../containers/types';
import { useGetCases, UpdateCase } from '../../containers/use_get_cases';
import { useGetCasesStatus } from '../../containers/use_get_cases_status';
import { useDeleteCases } from '../../containers/use_delete_cases';
import { EuiBasicTableOnChange } from '../../../detections/pages/detection_engine/rules/types';
import { Panel } from '../../../common/components/panel';
import {
  UtilityBar,
  UtilityBarAction,
  UtilityBarGroup,
  UtilityBarSection,
  UtilityBarText,
} from '../../../common/components/utility_bar';
import { getCreateCaseUrl, useFormatUrl } from '../../../common/components/link_to';
import { getBulkItems } from '../bulk_actions';
import { CaseHeaderPage } from '../case_header_page';
import { ConfirmDeleteCaseModal } from '../confirm_delete_case';
import { getActions } from './actions';
import { CasesTableFilters } from './table_filters';
import { useUpdateCases } from '../../containers/use_bulk_update_case';
import { useGetActionLicense } from '../../containers/use_get_action_license';
import { getActionLicenseError } from '../use_push_to_service/helpers';
import { CaseCallOut } from '../callout';
import { ConfigureCaseButton } from '../configure_cases/button';
import { ERROR_PUSH_SERVICE_CALLOUT_TITLE } from '../use_push_to_service/translations';
import { LinkButton } from '../../../common/components/links';
import { SecurityPageName } from '../../../app/types';
import { useKibana } from '../../../common/lib/kibana';
import { APP_ID } from '../../../../common/constants';
import { Stats } from '../status';
import { SELECTABLE_MESSAGE_COLLECTIONS } from '../../translations';
import { getExpandedRowMap } from './expanded_row';
import { isSelectedCasesIncludeCollections } from './helpers';

const Div = styled.div`
  margin-top: ${({ theme }) => theme.eui.paddingSizes.m};
`;

const FlexItemDivider = styled(EuiFlexItem)`
  ${({ theme }) => css`
    .euiFlexGroup--gutterMedium > &.euiFlexItem {
      border-right: ${theme.eui.euiBorderThin};
      padding-right: ${theme.eui.euiSize};
      margin-right: ${theme.eui.euiSize};
    }
  `}
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

const EuiBasicTable: any = _EuiBasicTable; // eslint-disable-line @typescript-eslint/no-explicit-any
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

interface AllCasesProps {
  onRowClick?: (theCase?: Case | SubCase) => void;
  isModal?: boolean;
  userCanCrud: boolean;
  disabledStatuses?: CaseStatuses[];
  disabledCases?: CaseType[];
}
export const AllCases = React.memo<AllCasesProps>(
  ({ onRowClick, isModal = false, userCanCrud, disabledStatuses, disabledCases = [] }) => {
    const { navigateToApp } = useKibana().services.application;
    const { formatUrl, search: urlSearch } = useFormatUrl(SecurityPageName.case);
    const { actionLicense } = useGetActionLicense();
    const {
      countOpenCases,
      countInProgressCases,
      countClosedCases,
      isLoading: isCasesStatusLoading,
      fetchCasesStatus,
    } = useGetCasesStatus();
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
      isLoading: isDeleting,
      isDeleted,
      isDisplayConfirmDeleteModal,
    } = useDeleteCases();

    // Update case
    const {
      dispatchResetIsUpdated,
      isLoading: isUpdating,
      isUpdated,
      updateBulkStatus,
    } = useUpdateCases();
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
        fetchCasesStatus();
        setSelectedCases([]);
        setDeleteBulk([]);
        if (filterRefetch.current != null) {
          filterRefetch.current();
        }
      },
      [filterRefetch, refetchCases, setSelectedCases, fetchCasesStatus]
    );

    useEffect(() => {
      if (isDeleted) {
        refreshCases();
        dispatchResetIsDeleted();
      }
      if (isUpdated) {
        refreshCases();
        dispatchResetIsUpdated();
      }
    }, [isDeleted, isUpdated, refreshCases, dispatchResetIsDeleted, dispatchResetIsUpdated]);
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

    const toggleDeleteModal = useCallback(
      (deleteCase: Case) => {
        handleToggleModal();
        setDeleteThisCase({ id: deleteCase.id, title: deleteCase.title, type: deleteCase.type });
      },
      [handleToggleModal]
    );

    const toggleBulkDeleteModal = useCallback(
      (cases: Case[]) => {
        handleToggleModal();
        if (cases.length === 1) {
          const singleCase = cases[0];
          if (singleCase) {
            return setDeleteThisCase({
              id: singleCase.id,
              title: singleCase.title,
              type: singleCase.type,
            });
          }
        }
        const convertToDeleteCases: DeleteCase[] = cases.map(({ id, title, type }) => ({
          id,
          title,
          type,
        }));
        setDeleteBulk(convertToDeleteCases);
      },
      [setDeleteBulk, handleToggleModal]
    );

    const handleUpdateCaseStatus = useCallback(
      (status: string) => {
        updateBulkStatus(selectedCases, status);
      },
      [selectedCases, updateBulkStatus]
    );

    const getBulkItemsPopoverContent = useCallback(
      (closePopover: () => void) => (
        <EuiContextMenuPanel
          data-test-subj="cases-bulk-actions"
          items={getBulkItems({
            caseStatus: filterOptions.status,
            closePopover,
            deleteCasesAction: toggleBulkDeleteModal,
            selectedCases,
            updateCaseStatus: handleUpdateCaseStatus,
            includeCollections: isSelectedCasesIncludeCollections(selectedCases),
          })}
        />
      ),
      [selectedCases, filterOptions.status, toggleBulkDeleteModal, handleUpdateCaseStatus]
    );
    const handleDispatchUpdate = useCallback(
      (args: Omit<UpdateCase, 'refetchCasesStatus'>) => {
        dispatchUpdateCaseProperty({ ...args, refetchCasesStatus: fetchCasesStatus });
      },
      [dispatchUpdateCaseProperty, fetchCasesStatus]
    );

    const goToCreateCase = useCallback(
      (ev) => {
        ev.preventDefault();
        if (isModal && onRowClick != null) {
          onRowClick();
        } else {
          navigateToApp(`${APP_ID}:${SecurityPageName.case}`, {
            path: getCreateCaseUrl(urlSearch),
          });
        }
      },
      [navigateToApp, isModal, onRowClick, urlSearch]
    );

    const actions = useMemo(
      () =>
        getActions({
          caseStatus: filterOptions.status,
          deleteCaseOnClick: toggleDeleteModal,
          dispatchUpdate: handleDispatchUpdate,
        }),
      [filterOptions.status, toggleDeleteModal, handleDispatchUpdate]
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
          setQueryParams({ sortField: SortFieldCase.updatedAt });
        }
        setFilters(newFilterOptions);
        refreshCases(false);
      },
      [refreshCases, setQueryParams, setFilters]
    );

    const memoizedGetCasesColumns = useMemo(
      () => getCasesColumns(userCanCrud ? actions : [], filterOptions.status, isModal),
      [actions, filterOptions.status, userCanCrud, isModal]
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
        const onTableRowClick = memoize(() => {
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
      [isModal, onRowClick]
    );

    const enableBuckActions = userCanCrud && !isModal;

    return (
      <>
        {!isEmpty(actionsErrors) && (
          <CaseCallOut title={ERROR_PUSH_SERVICE_CALLOUT_TITLE} messages={actionsErrors} />
        )}
        {!isModal && (
          <CaseHeaderPage title={i18n.PAGE_TITLE}>
            <EuiFlexGroup
              alignItems="center"
              gutterSize="m"
              responsive={false}
              wrap={true}
              data-test-subj="all-cases-header"
            >
              <EuiFlexItem grow={false}>
                <Stats
                  dataTestSubj="openStatsHeader"
                  caseCount={countOpenCases}
                  caseStatus={CaseStatuses.open}
                  isLoading={isCasesStatusLoading}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <Stats
                  dataTestSubj="inProgressStatsHeader"
                  caseCount={countInProgressCases}
                  caseStatus={CaseStatuses['in-progress']}
                  isLoading={isCasesStatusLoading}
                />
              </EuiFlexItem>
              <FlexItemDivider grow={false}>
                <Stats
                  dataTestSubj="closedStatsHeader"
                  caseCount={countClosedCases}
                  caseStatus={CaseStatuses.closed}
                  isLoading={isCasesStatusLoading}
                />
              </FlexItemDivider>
              <EuiFlexItem grow={false}>
                <ConfigureCaseButton
                  label={i18n.CONFIGURE_CASES_BUTTON}
                  isDisabled={!isEmpty(actionsErrors) || !userCanCrud}
                  showToolTip={!isEmpty(actionsErrors)}
                  msgTooltip={!isEmpty(actionsErrors) ? actionsErrors[0].description : <></>}
                  titleTooltip={!isEmpty(actionsErrors) ? actionsErrors[0].title : ''}
                  urlSearch={urlSearch}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <LinkButton
                  isDisabled={!userCanCrud}
                  fill
                  onClick={goToCreateCase}
                  href={formatUrl(getCreateCaseUrl())}
                  iconType="plusInCircle"
                  data-test-subj="createNewCaseBtn"
                >
                  {i18n.CREATE_TITLE}
                </LinkButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </CaseHeaderPage>
        )}
        {(isCasesLoading || isDeleting || isUpdating) && !isDataEmpty && (
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
              <UtilityBar border>
                <UtilityBarSection>
                  <UtilityBarGroup>
                    <UtilityBarText data-test-subj="case-table-case-count">
                      {i18n.SHOWING_CASES(data.total ?? 0)}
                    </UtilityBarText>
                  </UtilityBarGroup>
                  {!isModal && (
                    <UtilityBarGroup data-test-subj="case-table-utility-bar-actions">
                      {enableBuckActions && (
                        <UtilityBarText data-test-subj="case-table-selected-case-count">
                          {i18n.SHOWING_SELECTED_CASES(selectedCases.length)}
                        </UtilityBarText>
                      )}
                      {enableBuckActions && (
                        <UtilityBarAction
                          data-test-subj="case-table-bulk-actions"
                          iconSide="right"
                          iconType="arrowDown"
                          popoverContent={getBulkItemsPopoverContent}
                        >
                          {i18n.BULK_ACTIONS}
                        </UtilityBarAction>
                      )}
                      <UtilityBarAction iconSide="left" iconType="refresh" onClick={refreshCases}>
                        {i18n.REFRESH}
                      </UtilityBarAction>
                    </UtilityBarGroup>
                  )}
                </UtilityBarSection>
              </UtilityBar>
              <BasicTable
                columns={memoizedGetCasesColumns}
                data-test-subj="cases-table"
                isSelectable={enableBuckActions}
                itemId="id"
                items={data.cases}
                itemIdToExpandedRowMap={itemIdToExpandedRowMap}
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
                        href={formatUrl(getCreateCaseUrl())}
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
                selection={enableBuckActions ? euiBasicTableSelectionProps : undefined}
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
