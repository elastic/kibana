/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, MutableRefObject, useCallback } from 'react';
import {
  EuiEmptyPrompt,
  EuiLoadingContent,
  EuiTableSelectionType,
  EuiBasicTable,
  EuiBasicTableProps,
  Pagination,
} from '@elastic/eui';
import classnames from 'classnames';
import styled from 'styled-components';

import { CasesTableUtilityBar } from './utility_bar';
import { LinkButton } from '../links';
import { AllCases, Case, FilterOptions } from '../../../common/ui/types';
import * as i18n from './translations';
import { useCreateCaseNavigation } from '../../common/navigation';

interface CasesTableProps {
  columns: EuiBasicTableProps<Case>['columns'];
  data: AllCases;
  filterOptions: FilterOptions;
  goToCreateCase?: () => void;
  handleIsLoading: (a: boolean) => void;
  isCasesLoading: boolean;
  isCommentUpdating: boolean;
  isDataEmpty: boolean;
  isSelectorView?: boolean;
  onChange: EuiBasicTableProps<Case>['onChange'];
  pagination: Pagination;
  refreshCases: (a?: boolean) => void;
  selectedCases: Case[];
  selection: EuiTableSelectionType<Case>;
  showActions: boolean;
  sorting: EuiBasicTableProps<Case>['sorting'];
  tableRef: MutableRefObject<EuiBasicTable | null>;
  tableRowProps: EuiBasicTableProps<Case>['rowProps'];
  userCanCrud: boolean;
}

const Div = styled.div`
  margin-top: ${({ theme }) => theme.eui.paddingSizes.m};
`;

export const CasesTable: FunctionComponent<CasesTableProps> = ({
  columns,
  data,
  filterOptions,
  goToCreateCase,
  handleIsLoading,
  isCasesLoading,
  isCommentUpdating,
  isDataEmpty,
  isSelectorView,
  onChange,
  pagination,
  refreshCases,
  selectedCases,
  selection,
  showActions,
  sorting,
  tableRef,
  tableRowProps,
  userCanCrud,
}) => {
  const { getCreateCaseUrl, navigateToCreateCase } = useCreateCaseNavigation();
  const navigateToCreateCaseClick = useCallback(
    (ev) => {
      ev.preventDefault();
      if (goToCreateCase != null) {
        goToCreateCase();
      } else {
        navigateToCreateCase();
      }
    },
    [goToCreateCase, navigateToCreateCase]
  );

  return isCasesLoading && isDataEmpty ? (
    <Div>
      <EuiLoadingContent data-test-subj="initialLoadingPanelAllCases" lines={10} />
    </Div>
  ) : (
    <Div data-test-subj={isCasesLoading ? 'cases-table-loading' : null}>
      <CasesTableUtilityBar
        data={data}
        enableBulkActions={showActions}
        filterOptions={filterOptions}
        handleIsLoading={handleIsLoading}
        selectedCases={selectedCases}
        refreshCases={refreshCases}
      />
      <EuiBasicTable
        className={classnames({ isSelectorView })}
        columns={columns}
        data-test-subj="cases-table"
        isSelectable={showActions}
        itemId="id"
        items={data.cases}
        loading={isCommentUpdating}
        noItemsMessage={
          <EuiEmptyPrompt
            title={<h3>{i18n.NO_CASES}</h3>}
            titleSize="xs"
            body={userCanCrud ? i18n.NO_CASES_BODY : i18n.NO_CASES_BODY_READ_ONLY}
            actions={
              userCanCrud && (
                <LinkButton
                  isDisabled={!userCanCrud}
                  fill
                  size="s"
                  onClick={navigateToCreateCaseClick}
                  href={getCreateCaseUrl()}
                  iconType="plusInCircle"
                  data-test-subj="cases-table-add-case"
                >
                  {i18n.CREATE_CASE_TITLE}
                </LinkButton>
              )
            }
          />
        }
        onChange={onChange}
        pagination={pagination}
        ref={tableRef}
        rowProps={tableRowProps}
        selection={showActions ? selection : undefined}
        sorting={sorting}
      />
    </Div>
  );
};
CasesTable.displayName = 'CasesTable';
