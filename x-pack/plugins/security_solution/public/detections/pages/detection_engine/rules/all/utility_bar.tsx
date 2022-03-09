/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiContextMenu,
  EuiContextMenuPanel,
  EuiSwitch,
  EuiSwitchEvent,
  EuiContextMenuPanelDescriptor,
} from '@elastic/eui';
import React, { useCallback } from 'react';

import {
  UtilityBar,
  UtilityBarAction,
  UtilityBarGroup,
  UtilityBarSection,
  UtilityBarText,
} from '../../../../../common/components/utility_bar';
import * as i18n from '../translations';
import { useRulesFeatureTourContextOptional } from './rules_feature_tour_context';

import { OptionalEuiTourStep } from './optional_eui_tour_step';

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
    // use optional rulesFeatureTourContext as AllRulesUtilityBar can be used outside the context
    const featureTour = useRulesFeatureTourContextOptional();

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
                  <OptionalEuiTourStep stepProps={featureTour?.steps?.bulkActionsStepProps}>
                    <UtilityBarAction
                      disabled={hasDisabledActions}
                      inProgress={isBulkActionInProgress}
                      dataTestSubj="bulkActions"
                      iconSide="right"
                      iconType="arrowDown"
                      popoverPanelPaddingSize="none"
                      popoverContent={handleGetBulkItemsPopoverContent}
                      onClick={() => {
                        if (featureTour?.steps?.bulkActionsStepProps?.isStepOpen) {
                          featureTour?.finishTour();
                        }
                      }}
                    >
                      {i18n.BATCH_ACTIONS}
                    </UtilityBarAction>
                  </OptionalEuiTourStep>
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
      </UtilityBar>
    );
  }
);

AllRulesUtilityBar.displayName = 'AllRulesUtilityBar';
