/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent, MutableRefObject } from 'react';
import React, { useCallback } from 'react';
import { css } from '@emotion/react';
import type { EuiTableSelectionType, EuiBasicTableProps, Pagination } from '@elastic/eui';
import { EuiEmptyPrompt, EuiSkeletonText, EuiBasicTable, useEuiTheme } from '@elastic/eui';
import classnames from 'classnames';

import { LinkButton } from '../links';

import type { CasesFindResponseUI, CaseUI } from '../../../common/ui/types';

import * as i18n from './translations';
import { useCreateCaseNavigation } from '../../common/navigation';
import { useCasesContext } from '../cases_context/use_cases_context';

interface CasesTableProps {
  columns: EuiBasicTableProps<CaseUI>['columns'];
  data: CasesFindResponseUI;
  goToCreateCase?: () => void;
  isCasesLoading: boolean;
  isCommentUpdating: boolean;
  isDataEmpty: boolean;
  isSelectorView?: boolean;
  onChange: EuiBasicTableProps<CaseUI>['onChange'];
  pagination: Pagination;
  selection: EuiTableSelectionType<CaseUI>;
  sorting: EuiBasicTableProps<CaseUI>['sorting'];
  tableRef?: MutableRefObject<EuiBasicTable | null>;
  tableRowProps: EuiBasicTableProps<CaseUI>['rowProps'];
  isLoadingColumns: boolean;
}

export const CasesTable: FunctionComponent<CasesTableProps> = ({
  columns,
  data,
  goToCreateCase,
  isCasesLoading,
  isCommentUpdating,
  isDataEmpty,
  isSelectorView,
  onChange,
  pagination,
  selection,
  sorting,
  tableRef,
  tableRowProps,
  isLoadingColumns,
}) => {
  const { permissions } = useCasesContext();
  const { getCreateCaseUrl, navigateToCreateCase } = useCreateCaseNavigation();
  const { euiTheme } = useEuiTheme();
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

  return (isCasesLoading && isDataEmpty) || isLoadingColumns ? (
    <div
      css={css`
        margin-top: ${euiTheme.size.m};
      `}
    >
      <EuiSkeletonText data-test-subj="initialLoadingPanelAllCases" lines={10} />
    </div>
  ) : (
    <>
      <EuiBasicTable
        className={classnames({ isSelectorView })}
        columns={columns}
        data-test-subj="cases-table"
        isSelectable={!isSelectorView}
        itemId="id"
        items={data.cases}
        loading={isCommentUpdating}
        noItemsMessage={
          <EuiEmptyPrompt
            title={<h3>{i18n.NO_CASES}</h3>}
            titleSize="xs"
            body={permissions.create ? i18n.NO_CASES_BODY : i18n.NO_CASES_BODY_READ_ONLY}
            actions={
              permissions.create && (
                <LinkButton
                  isDisabled={!permissions.create}
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
        selection={!isSelectorView ? selection : undefined}
        sorting={sorting}
      />
    </>
  );
};
CasesTable.displayName = 'CasesTable';
