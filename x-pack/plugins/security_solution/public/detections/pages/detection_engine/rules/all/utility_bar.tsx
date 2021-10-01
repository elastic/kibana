/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenuPanel, EuiSwitch, EuiSwitchEvent } from '@elastic/eui';
import React, { useCallback } from 'react';

import {
  UtilityBar,
  UtilityBarAction,
  UtilityBarGroup,
  UtilityBarSection,
  UtilityBarText,
} from '../../../../../common/components/utility_bar';
import * as i18n from '../translations';

interface AllRulesUtilityBarProps {
  canBulkEdit: boolean;
  isAllSelected?: boolean;
  isAutoRefreshOn?: boolean;
  numberSelectedItems: number;
  onGetBatchItemsPopoverContent?: (closePopover: () => void) => JSX.Element[];
  onRefresh?: (refreshRule: boolean) => void;
  onRefreshSwitch?: (checked: boolean) => void;
  onToggleSelectAll?: () => void;
  paginationTotal: number;
  showBulkActions: boolean;
  hasPagination?: boolean;
}

export const AllRulesUtilityBar = React.memo<AllRulesUtilityBarProps>(
  ({
    canBulkEdit,
    isAllSelected,
    isAutoRefreshOn,
    numberSelectedItems,
    onGetBatchItemsPopoverContent,
    onRefresh,
    onRefreshSwitch,
    onToggleSelectAll,
    paginationTotal,
    showBulkActions = true,
    hasPagination,
  }) => {
    const handleGetBatchItemsPopoverContent = useCallback(
      (closePopover: () => void): JSX.Element | null => {
        if (onGetBatchItemsPopoverContent != null) {
          return <EuiContextMenuPanel items={onGetBatchItemsPopoverContent(closePopover)} />;
        } else {
          return null;
        }
      },
      [onGetBatchItemsPopoverContent]
    );

    const handleAutoRefreshSwitch = useCallback(
      (closePopover: () => void) => (e: EuiSwitchEvent) => {
        if (onRefreshSwitch != null) {
          onRefreshSwitch(e.target.checked);
          closePopover();
        }
      },
      [onRefreshSwitch]
    );

    const handleGetRefreshSettingsPopoverContent = useCallback(
      (closePopover: () => void) => (
        <EuiContextMenuPanel
          items={[
            <EuiSwitch
              key="allRulesAutoRefreshSwitch"
              label={i18n.REFRESH_RULE_POPOVER_DESCRIPTION}
              checked={isAutoRefreshOn ?? false}
              onChange={handleAutoRefreshSwitch(closePopover)}
              compressed
              data-test-subj="refreshSettingsSwitch"
            />,
          ]}
        />
      ),
      [isAutoRefreshOn, handleAutoRefreshSwitch]
    );

    return (
      <UtilityBar>
        <UtilityBarSection>
          <UtilityBarGroup>
            {showBulkActions ? (
              <UtilityBarText dataTestSubj="showingRules">
                {i18n.SHOWING_RULES(paginationTotal)}
              </UtilityBarText>
            ) : (
              <UtilityBarText dataTestSubj="showingExceptionLists">
                {i18n.SHOWING_EXCEPTION_LISTS(paginationTotal)}
              </UtilityBarText>
            )}
          </UtilityBarGroup>

          {showBulkActions ? (
            <>
              <UtilityBarGroup data-test-subj="tableBulkActions">
                <UtilityBarText dataTestSubj="selectedRules">
                  {i18n.SELECTED_RULES(numberSelectedItems)}
                </UtilityBarText>

                {canBulkEdit && onToggleSelectAll && hasPagination && (
                  <UtilityBarAction
                    dataTestSubj="selectAllRules"
                    iconType={isAllSelected ? 'cross' : 'pagesSelect'}
                    iconSide="left"
                    onClick={onToggleSelectAll}
                  >
                    {isAllSelected ? i18n.CLEAR_SELECTION : i18n.SELECT_ALL_RULES(paginationTotal)}
                  </UtilityBarAction>
                )}

                {canBulkEdit && (
                  <UtilityBarAction
                    dataTestSubj="bulkActions"
                    iconSide="right"
                    iconType="arrowDown"
                    popoverContent={handleGetBatchItemsPopoverContent}
                  >
                    {i18n.BATCH_ACTIONS}
                  </UtilityBarAction>
                )}

                <UtilityBarAction
                  dataTestSubj="refreshRulesAction"
                  iconSide="left"
                  iconType="refresh"
                  onClick={onRefresh}
                >
                  {i18n.REFRESH}
                </UtilityBarAction>
                <UtilityBarAction
                  dataTestSubj="refreshSettings"
                  iconSide="right"
                  iconType="arrowDown"
                  popoverContent={handleGetRefreshSettingsPopoverContent}
                >
                  {i18n.REFRESH_RULE_POPOVER_LABEL}
                </UtilityBarAction>
              </UtilityBarGroup>
            </>
          ) : (
            <UtilityBarGroup>
              <UtilityBarAction
                dataTestSubj="refreshRulesAction"
                iconSide="left"
                iconType="refresh"
                onClick={onRefresh}
              >
                {i18n.REFRESH}
              </UtilityBarAction>
            </UtilityBarGroup>
          )}
        </UtilityBarSection>
      </UtilityBar>
    );
  }
);

AllRulesUtilityBar.displayName = 'AllRulesUtilityBar';
