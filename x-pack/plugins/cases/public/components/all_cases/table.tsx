/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import {
  EuiEmptyPrompt,
  EuiLoadingContent,
  EuiTableSelectionType,
  EuiBasicTable as _EuiBasicTable,
  EuiBasicTableProps,
} from '@elastic/eui';
import classnames from 'classnames';
import styled from 'styled-components';

import { CasesTableUtilityBar } from './utility_bar';
import { CasesNavigation, LinkButton } from '../links';
import { AllCases, Case, FilterOptions } from '../../../common';
import * as i18n from './translations';

interface CasesTableProps {
  columns: EuiBasicTableProps<Case>['columns']; //  CasesColumns[];
  createCaseNavigation: CasesNavigation;
  data: AllCases;
  filterOptions: FilterOptions;
  goToCreateCase: (e: React.MouseEvent) => void;
  handleIsLoading: (a: boolean) => void;
  isCasesLoading: boolean;
  isCommentUpdating: boolean;
  isDataEmpty: boolean;
  isSelectorView?: boolean;
  itemIdToExpandedRowMap: EuiBasicTableProps<Case>['itemIdToExpandedRowMap'];
  onChange: EuiBasicTableProps<Case>['onChange'];
  pagination: EuiBasicTableProps<Case>['pagination'];
  refreshCases: (a?: boolean) => void;
  selectedCases: Case[];
  selection: EuiTableSelectionType<Case>;
  showActions: boolean;
  sorting: EuiBasicTableProps<Case>['sorting'];
  tableRowProps: EuiBasicTableProps<Case>['rowProps'];
  userCanCrud: boolean;
}

const EuiBasicTable: any = _EuiBasicTable;
const BasicTable = styled(EuiBasicTable)`
  ${({ theme }) => `
    .euiTableRow-isExpandedRow.euiTableRow-isSelectable .euiTableCellContent {
      padding: 8px 0 8px 32px;
    }

    &.isSelectorView .euiTableRow.isDisabled {
      cursor: not-allowed;
      background-color: ${theme.eui.euiTableHoverClickableColor};
    }

    &.isSelectorView .euiTableRow.euiTableRow-isExpandedRow .euiTableRowCell,
    &.isSelectorView .euiTableRow.euiTableRow-isExpandedRow:hover {
      background-color: transparent;
    }

    &.isSelectorView .euiTableRow.euiTableRow-isExpandedRow {
      .subCase:hover {
        background-color: ${theme.eui.euiTableHoverClickableColor};
      }
    }
  `}
`;

const Div = styled.div`
  margin-top: ${({ theme }) => theme.eui.paddingSizes.m};
`;

export const CasesTable: FunctionComponent<CasesTableProps> = ({
  columns,
  createCaseNavigation,
  data,
  filterOptions,
  goToCreateCase,
  handleIsLoading,
  isCasesLoading,
  isCommentUpdating,
  isDataEmpty,
  isSelectorView,
  itemIdToExpandedRowMap,
  onChange,
  pagination,
  refreshCases,
  selectedCases,
  selection,
  showActions,
  sorting,
  tableRowProps,
  userCanCrud,
}) =>
  isCasesLoading && isDataEmpty ? (
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
        loading={isCommentUpdating}
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
        onChange={onChange}
        pagination={pagination}
        rowProps={tableRowProps}
        selection={showActions ? selection : undefined}
        sorting={sorting}
        className={classnames({ isSelectorView })}
      />
    </Div>
  );
