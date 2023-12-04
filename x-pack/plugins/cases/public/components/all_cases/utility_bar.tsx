/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useCallback, useState } from 'react';
import type { Pagination } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiContextMenu,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import * as i18n from './translations';
import type { CasesUI } from '../../../common/ui/types';
import type { CasesColumnSelection } from './types';
import { MAX_DOCS_PER_PAGE } from '../../../common/constants';
import { useRefreshCases } from './use_on_refresh_cases';
import { useBulkActions } from './use_bulk_actions';
import { useCasesContext } from '../cases_context/use_cases_context';
import { ColumnsPopover } from './columns_popover';
import { MaxCasesWarning } from './max_cases_warning';

interface Props {
  isSelectorView?: boolean;
  totalCases: number;
  selectedCases: CasesUI;
  deselectCases: () => void;
  pagination: Pagination;
  selectedColumns: CasesColumnSelection[];
  onSelectedColumnsChange: (columns: CasesColumnSelection[]) => void;
}

export const CasesTableUtilityBar: FunctionComponent<Props> = React.memo(
  ({
    isSelectorView,
    totalCases,
    selectedCases,
    deselectCases,
    pagination,
    selectedColumns,
    onSelectedColumnsChange,
  }) => {
    const { euiTheme } = useEuiTheme();
    const refreshCases = useRefreshCases();
    const { permissions } = useCasesContext();

    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    const togglePopover = useCallback(() => setIsPopoverOpen(!isPopoverOpen), [isPopoverOpen]);
    const closePopover = useCallback(() => setIsPopoverOpen(false), []);

    const onRefresh = useCallback(() => {
      deselectCases();
      refreshCases();
    }, [deselectCases, refreshCases]);

    const { panels, modals, flyouts } = useBulkActions({
      selectedCases,
      onAction: closePopover,
      onActionSuccess: onRefresh,
    });

    /**
     * At least update or delete permissions needed to show bulk actions.
     * Granular permission check for each action is performed
     * in the useBulkActions hook.
     */
    const showBulkActions = (permissions.update || permissions.delete) && selectedCases.length > 0;

    const visibleCases =
      pagination?.pageSize && totalCases > pagination.pageSize ? pagination.pageSize : totalCases;

    const totalCasesDisplayed = totalCases > MAX_DOCS_PER_PAGE ? MAX_DOCS_PER_PAGE : totalCases;

    console.log({ visibleCases, totalCases, pagination });
    return (
      <>
        <EuiFlexGroup
          justifyContent="spaceBetween"
          alignItems="center"
          gutterSize="s"
          css={{
            borderBottom: euiTheme.border.thin,
            marginTop: 0,
            marginBottom: 0,
            paddingTop: euiTheme.size.s,
            paddingBottom: euiTheme.size.s,
          }}
        >
          <EuiFlexItem grow={false}>
            <EuiFlexGroup justifyContent="flexStart" gutterSize="s" alignItems="center">
              <EuiFlexItem
                data-test-subj="case-table-case-count"
                grow={false}
                css={{
                  borderRight: euiTheme.border.thin,
                  paddingRight: euiTheme.size.s,
                }}
              >
                <EuiText size="xs" color="subdued">
                  {i18n.SHOWING_CASES(totalCasesDisplayed, visibleCases)}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem data-test-subj="case-table-utility-bar-actions" grow={false}>
                <EuiFlexGroup alignItems="center" justifyContent="flexStart" gutterSize="s">
                  {!isSelectorView && showBulkActions && (
                    <>
                      <EuiFlexItem data-test-subj="case-table-selected-case-count" grow={false}>
                        <EuiText size="xs" color="subdued">
                          {i18n.SHOWING_SELECTED_CASES(selectedCases.length)}
                        </EuiText>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiPopover
                          isOpen={isPopoverOpen}
                          closePopover={closePopover}
                          panelPaddingSize="none"
                          data-test-subj="case-table-bulk-actions-popover"
                          button={
                            <EuiButtonEmpty
                              onClick={togglePopover}
                              size="xs"
                              iconSide="right"
                              iconType="arrowDown"
                              flush="left"
                              data-test-subj="case-table-bulk-actions-link-icon"
                            >
                              {i18n.BULK_ACTIONS}
                            </EuiButtonEmpty>
                          }
                        >
                          <EuiContextMenu
                            panels={panels}
                            initialPanelId={0}
                            data-test-subj="case-table-bulk-actions-context-menu"
                          />
                        </EuiPopover>
                      </EuiFlexItem>
                    </>
                  )}
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      onClick={onRefresh}
                      size="xs"
                      iconSide="left"
                      iconType="refresh"
                      flush="left"
                      data-test-subj="all-cases-refresh-link-icon"
                    >
                      {i18n.REFRESH}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          {!isSelectorView && (
            <EuiFlexItem grow={false}>
              <ColumnsPopover
                selectedColumns={selectedColumns}
                onSelectedColumnsChange={onSelectedColumnsChange}
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        {modals}
        {flyouts}
        <MaxCasesWarning key={totalCases} totalCases={totalCases} />
      </>
    );
  }
);

CasesTableUtilityBar.displayName = 'CasesTableUtilityBar';
