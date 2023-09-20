/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import { css } from '@emotion/react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
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
  EuiCallOut,
  EuiSpacer,
} from '@elastic/eui';
import * as i18n from './translations';
import type { CasesUI } from '../../../common/ui/types';
import { MAX_DOCS_PER_PAGE } from '../../../common/constants';
import { useRefreshCases } from './use_on_refresh_cases';
import { useBulkActions } from './use_bulk_actions';
import { useCasesContext } from '../cases_context/use_cases_context';

interface Props {
  isSelectorView?: boolean;
  totalCases: number;
  selectedCases: CasesUI;
  deselectCases: () => void;
  pagination: Pagination;
}

export const CasesTableUtilityBar: FunctionComponent<Props> = React.memo(
  ({ isSelectorView, totalCases, selectedCases, deselectCases, pagination }) => {
    const { euiTheme } = useEuiTheme();
    const refreshCases = useRefreshCases();
    const { permissions, appId } = useCasesContext();

    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [isMessageDismissed, setIsMessageDismissed] = useState(false);
    const localStorageKey = `cases.${appId}.utilityBar.hideMaxLimitWarning`;
    const [localStorageWarning, setLocalStorageWarning] = useLocalStorage<boolean>(localStorageKey);

    const togglePopover = useCallback(() => setIsPopoverOpen(!isPopoverOpen), [isPopoverOpen]);
    const closePopover = useCallback(() => setIsPopoverOpen(false), []);

    const toggleWarning = useCallback(
      () => setIsMessageDismissed(!isMessageDismissed),
      [isMessageDismissed]
    );

    const onRefresh = useCallback(() => {
      deselectCases();
      refreshCases();
    }, [deselectCases, refreshCases]);

    const { panels, modals, flyouts } = useBulkActions({
      selectedCases,
      onAction: closePopover,
      onActionSuccess: onRefresh,
    });

    const handleNotShowAgain = () => {
      setLocalStorageWarning(true);
    };

    /**
     * At least update or delete permissions needed to show bulk actions.
     * Granular permission check for each action is performed
     * in the useBulkActions hook.
     */
    const showBulkActions = (permissions.update || permissions.delete) && selectedCases.length > 0;

    const visibleCases =
      pagination?.pageSize && totalCases > pagination.pageSize ? pagination.pageSize : totalCases;

    const hasReachedMaxCases =
      pagination.pageSize &&
      totalCases >= MAX_DOCS_PER_PAGE &&
      pagination.pageSize * (pagination.pageIndex + 1) >= MAX_DOCS_PER_PAGE;

    const isDoNotShowAgainSelected = localStorageWarning && localStorageWarning === true;

    const renderMaxLimitWarning = (): React.ReactNode => (
      <EuiFlexGroup gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiText
            color="default"
            size="m"
            css={css`
              margin-top: 4px;
            `}
          >
            {i18n.MAX_CASES(MAX_DOCS_PER_PAGE)}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            color="warning"
            data-test-subj="dismiss-warning"
            onClick={toggleWarning}
          >
            {i18n.DISMISS}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            color="warning"
            data-test-subj="do-not-show-warning"
            onClick={handleNotShowAgain}
          >
            {i18n.NOT_SHOW_AGAIN}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    );

    return (
      <>
        <EuiFlexGroup
          alignItems="center"
          justifyContent="flexStart"
          gutterSize="s"
          css={{
            borderBottom: euiTheme.border.thin,
            marginTop: 0,
            marginBottom: 0,
            paddingTop: euiTheme.size.s,
            paddingBottom: euiTheme.size.s,
          }}
        >
          <EuiFlexItem
            data-test-subj="case-table-case-count"
            grow={false}
            css={{
              borderRight: euiTheme.border.thin,
              paddingRight: euiTheme.size.s,
            }}
          >
            <EuiText size="xs" color="subdued">
              {i18n.SHOWING_CASES(totalCases, visibleCases)}
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
        {modals}
        {flyouts}
        {hasReachedMaxCases && !isMessageDismissed && !isDoNotShowAgainSelected && (
          <>
            <EuiSpacer size="m" />
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiCallOut
                  title={renderMaxLimitWarning()}
                  color="warning"
                  size="s"
                  data-test-subj="all-cases-maximum-limit-warning"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="m" />
          </>
        )}
      </>
    );
  }
);

CasesTableUtilityBar.displayName = 'CasesTableUtilityBar';
