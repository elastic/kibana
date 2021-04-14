/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
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
import {
  Case,
  CaseStatuses,
  CaseType,
  CommentRequestAlertType,
  CommentType,
  FilterOptions,
  SortFieldCase,
  SubCase,
} from '../../../common';
import { SELECTABLE_MESSAGE_COLLECTIONS } from '../../common/translations';
import { useGetActionLicense } from '../../containers/use_get_action_license';
import { useGetCases } from '../../containers/use_get_cases';
import { usePostComment } from '../../containers/use_post_comment';
import { CaseCallOut } from '../callout';
import { CaseDetailsHrefSchema, CasesNavigation, LinkButton } from '../links';
import { Panel } from '../panel';
import { getActionLicenseError } from '../use_push_to_service/helpers';
import { ERROR_PUSH_SERVICE_CALLOUT_TITLE } from '../use_push_to_service/translations';
import { useCasesColumns } from './columns';
import { getExpandedRowMap } from './expanded_row';
import { CasesTableHeader } from './header';
import { CasesTableFilters } from './table_filters';
import { EuiBasicTableOnChange } from './types';
import { CasesTableUtilityBar } from './utility_bar';

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

const getSortField = (field: string): SortFieldCase =>
  field === SortFieldCase.closedAt ? SortFieldCase.closedAt : SortFieldCase.createdAt;

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
  caseDetailsNavigation?: CasesNavigation<CaseDetailsHrefSchema, 'configurable'>; // if not passed, case name is not displayed as a link (Formerly dependant on isModal)
  configureCasesNavigation?: CasesNavigation; // if not passed, header with nav is not displayed (Formerly dependant on isModal)
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
    const {
      data,
      filterOptions,
      loading,
      queryParams,
      selectedCases,
      refetchCases,
      setFilters,
      setQueryParams,
      setSelectedCases,
    } = useGetCases();

    // Post Comment to Case
    const { postComment, isLoading: isCommentsUpdating } = usePostComment();

    const filterRefetch = useRef<() => void>();
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
        if (isModal && onRowClick != null) {
          onRowClick();
        } else if (onCreateCaseNavClick) {
          onCreateCaseNavClick(ev);
        }
      },
      [isModal, onCreateCaseNavClick, onRowClick]
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

    const showActions = userCanCrud && !isModal;

    const columns = useCasesColumns({
      caseDetailsNavigation,
      filterStatus: filterOptions.status,
      refreshCases,
      handleIsLoading,
      showActions,
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
    const isCasesLoading = useMemo(() => loading.indexOf('cases') > -1, [loading]);
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

    return (
      <>
        {!isEmpty(actionsErrors) && (
          <CaseCallOut title={ERROR_PUSH_SERVICE_CALLOUT_TITLE} messages={actionsErrors} />
        )}
        {configureCasesNavigation != null && (
          <CasesTableHeader
            actionsErrors={actionsErrors}
            createCaseNavigation={createCaseNavigation}
            configureCasesNavigation={configureCasesNavigation}
            refresh={refresh}
            userCanCrud={userCanCrud}
          />
        )}
        {(isCasesLoading || isLoading || isCommentsUpdating) && !isDataEmpty && (
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
              <CasesTableUtilityBar
                data={data}
                enableBulkActions={showActions}
                filterOptions={filterOptions}
                handleIsLoading={handleIsLoading}
                selectedCases={selectedCases}
                refreshCases={refreshCases}
              />
              <BasicTable
                columns={columns}
                data-test-subj="cases-table"
                isSelectable={showActions}
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
                pagination={pagination}
                rowProps={tableRowProps}
                selection={showActions ? euiBasicTableSelectionProps : undefined}
                sorting={sorting}
                className={classnames({ isModal })}
              />
            </Div>
          )}
        </TableWrap>
      </>
    );
  }
);

AllCases.displayName = 'AllCases';

// eslint-disable-next-line import/no-default-export
export { AllCases as default };
