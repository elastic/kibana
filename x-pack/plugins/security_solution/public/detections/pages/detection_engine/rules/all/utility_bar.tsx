/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSwitchEvent, EuiContextMenuPanelDescriptor } from '@elastic/eui';
import {
  EuiContextMenu,
  EuiContextMenuPanel,
  EuiSwitch,
  EuiTextColor,
  EuiSpacer,
} from '@elastic/eui';
import React, { useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  UtilityBar,
  UtilityBarAction,
  UtilityBarGroup,
  UtilityBarSection,
  UtilityBarText,
} from '../../../../../common/components/utility_bar';
import * as i18n from '../translations';
import { useKibana } from '../../../../../common/lib/kibana';
import { useRulesTableContextOptional } from './rules_table/rules_table_context';

interface AllRulesUtilityBarProps {
  canBulkEdit: boolean;
  isAllSelected?: boolean;
  isAutoRefreshOn?: boolean;
  numberSelectedItems: number;
  onGetBulkItemsPopoverContent?: (closePopover: () => void) => EuiContextMenuPanelDescriptor[];
  onRefresh?: () => void;
  onRefreshSwitch?: (checked: boolean) => void;
  onToggleSelectAll?: () => void;
  paginationTotal: number;
  hasBulkActions: boolean;
  hasPagination?: boolean;
  isBulkActionInProgress?: boolean;
  hasDisabledActions?: boolean;
}

export const AllRulesUtilityBar = React.memo<AllRulesUtilityBarProps>(
  ({
    canBulkEdit,
    isAllSelected,
    isAutoRefreshOn,
    numberSelectedItems,
    onGetBulkItemsPopoverContent,
    onRefresh,
    onRefreshSwitch,
    onToggleSelectAll,
    paginationTotal,
    hasBulkActions = true,
    hasPagination,
    isBulkActionInProgress,
    hasDisabledActions,
  }) => {
    const { timelines } = useKibana().services;
    const rulesTableContext = useRulesTableContextOptional();
    const isAnyRuleSelected = numberSelectedItems > 0;

    const handleGetBulkItemsPopoverContent = useCallback(
      (closePopover: () => void): JSX.Element | null => {
        if (onGetBulkItemsPopoverContent != null) {
          return (
            <EuiContextMenu
              initialPanelId={0}
              panels={onGetBulkItemsPopoverContent(closePopover)}
            />
          );
        } else {
          return null;
        }
      },
      [onGetBulkItemsPopoverContent]
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
              disabled={isAnyRuleSelected}
              data-test-subj="refreshSettingsSwitch"
            />,
            ...(isAnyRuleSelected
              ? [
                  <div key="refreshSettingsSelectionNote">
                    <EuiSpacer size="s" />
                    <EuiTextColor color="subdued" data-test-subj="refreshSettingsSelectionNote">
                      <FormattedMessage
                        id="xpack.securitySolution.detectionEngine.rules.refreshRulePopoverSelectionHelpText"
                        defaultMessage="Note: Refresh is disabled while there is an active selection."
                      />
                    </EuiTextColor>
                  </div>,
                ]
              : []),
          ]}
        />
      ),
      [isAutoRefreshOn, handleAutoRefreshSwitch, isAnyRuleSelected]
    );

    return (
      <UtilityBar border>
        <UtilityBarSection>
          <UtilityBarGroup>
            {hasBulkActions ? (
              <UtilityBarText dataTestSubj="showingRules">
                {i18n.SHOWING_RULES(paginationTotal)}
              </UtilityBarText>
            ) : (
              <UtilityBarText dataTestSubj="showingExceptionLists">
                {i18n.SHOWING_EXCEPTION_LISTS(paginationTotal)}
              </UtilityBarText>
            )}
          </UtilityBarGroup>

          {hasBulkActions ? (
            <>
              <UtilityBarGroup data-test-subj="tableBulkActions">
                <UtilityBarText dataTestSubj="selectedRules">
                  {i18n.SELECTED_RULES(numberSelectedItems)}
                </UtilityBarText>

                {canBulkEdit && onToggleSelectAll && hasPagination && (
                  <UtilityBarAction
                    disabled={hasDisabledActions}
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
                    disabled={hasDisabledActions}
                    inProgress={isBulkActionInProgress}
                    dataTestSubj="bulkActions"
                    iconSide="right"
                    iconType="arrowDown"
                    popoverPanelPaddingSize="none"
                    popoverContent={handleGetBulkItemsPopoverContent}
                  >
                    {i18n.BATCH_ACTIONS}
                  </UtilityBarAction>
                )}

                <UtilityBarAction
                  disabled={hasDisabledActions}
                  dataTestSubj="refreshRulesAction"
                  iconSide="left"
                  iconType="refresh"
                  onClick={onRefresh}
                >
                  {i18n.REFRESH}
                </UtilityBarAction>
                <UtilityBarAction
                  disabled={hasDisabledActions}
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
        {rulesTableContext && (
          <UtilityBarSection dataTestSubj="refreshRulesStatus">
            {timelines.getLastUpdated({
              showUpdating: rulesTableContext.state.isFetching,
              updatedAt: rulesTableContext.state.lastUpdated,
            })}
          </UtilityBarSection>
        )}
      </UtilityBar>
    );
  }
);

AllRulesUtilityBar.displayName = 'AllRulesUtilityBar';
