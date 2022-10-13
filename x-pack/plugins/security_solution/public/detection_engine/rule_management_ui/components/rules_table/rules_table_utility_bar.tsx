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
} from '../../../../common/components/utility_bar';
import * as i18n from '../../../../detections/pages/detection_engine/rules/translations';
import { useKibana } from '../../../../common/lib/kibana';
import { useRulesTableContext } from './rules_table/rules_table_context';
import type { PaginationOptions } from '../../../rule_management/logic/types';

export const getShowingRulesParams = ({ page, perPage, total: totalRules }: PaginationOptions) => {
  const firstInPage = totalRules === 0 ? 0 : (page - 1) * perPage + 1;
  const lastInPage = page * perPage > totalRules ? totalRules : page * perPage;

  return [firstInPage, lastInPage, totalRules] as const;
};

interface RulesTableUtilityBarProps {
  canBulkEdit: boolean;
  isAllSelected?: boolean;
  isAutoRefreshOn?: boolean;
  numberSelectedItems: number;
  onGetBulkItemsPopoverContent?: (closePopover: () => void) => EuiContextMenuPanelDescriptor[];
  onRefresh: () => void;
  onRefreshSwitch: (checked: boolean) => void;
  onToggleSelectAll: () => void;
  pagination: PaginationOptions;
  isBulkActionInProgress?: boolean;
  hasDisabledActions?: boolean;
}

export const RulesTableUtilityBar = React.memo<RulesTableUtilityBarProps>(
  ({
    canBulkEdit,
    isAllSelected,
    isAutoRefreshOn,
    numberSelectedItems,
    onGetBulkItemsPopoverContent,
    onRefresh,
    onRefreshSwitch,
    onToggleSelectAll,
    pagination,
    isBulkActionInProgress,
    hasDisabledActions,
  }) => {
    const { timelines } = useKibana().services;
    const rulesTableContext = useRulesTableContext();
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
            <UtilityBarText dataTestSubj="showingRules">
              {i18n.SHOWING_RULES(...getShowingRulesParams(pagination))}
            </UtilityBarText>
          </UtilityBarGroup>
          <>
            <UtilityBarGroup data-test-subj="tableBulkActions">
              <UtilityBarText dataTestSubj="selectedRules">
                {i18n.SELECTED_RULES(numberSelectedItems)}
              </UtilityBarText>

              {canBulkEdit && (
                <UtilityBarAction
                  disabled={hasDisabledActions}
                  dataTestSubj="selectAllRules"
                  iconType={isAllSelected ? 'cross' : 'pagesSelect'}
                  iconSide="left"
                  onClick={onToggleSelectAll}
                >
                  {isAllSelected ? i18n.CLEAR_SELECTION : i18n.SELECT_ALL_RULES(pagination.total)}
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
        </UtilityBarSection>
        <UtilityBarSection dataTestSubj="refreshRulesStatus">
          {timelines.getLastUpdated({
            showUpdating: rulesTableContext.state.isFetching,
            updatedAt: rulesTableContext.state.lastUpdated,
          })}
        </UtilityBarSection>
      </UtilityBar>
    );
  }
);

RulesTableUtilityBar.displayName = 'RulesTableUtilityBar';
