/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
  userHasNoPermissions: boolean;
  numberSelectedRules: number;
  paginationTotal: number;
  isAutoRefreshOn: boolean;
  onRefresh: (refreshRule: boolean) => void;
  onGetBatchItemsPopoverContent: (closePopover: () => void) => JSX.Element[];
  onRefreshSwitch: (checked: boolean) => void;
}

export const AllRulesUtilityBar = React.memo<AllRulesUtilityBarProps>(
  ({
    userHasNoPermissions,
    onRefresh,
    paginationTotal,
    numberSelectedRules,
    onGetBatchItemsPopoverContent,
    isAutoRefreshOn,
    onRefreshSwitch,
  }) => {
    const handleGetBatchItemsPopoverContent = useCallback(
      (closePopover: () => void) => (
        <EuiContextMenuPanel items={onGetBatchItemsPopoverContent(closePopover)} />
      ),
      [onGetBatchItemsPopoverContent]
    );

    const handleAutoRefreshSwitch = useCallback(
      (closePopover: () => void) => (e: EuiSwitchEvent) => {
        onRefreshSwitch(e.target.checked);
        closePopover();
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
              checked={isAutoRefreshOn}
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
            <UtilityBarText dataTestSubj="showingRules">
              {i18n.SHOWING_RULES(paginationTotal)}
            </UtilityBarText>
          </UtilityBarGroup>

          <UtilityBarGroup>
            <UtilityBarText dataTestSubj="selectedRules">
              {i18n.SELECTED_RULES(numberSelectedRules)}
            </UtilityBarText>
            {!userHasNoPermissions && (
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
        </UtilityBarSection>
      </UtilityBar>
    );
  }
);

AllRulesUtilityBar.displayName = 'AllRulesUtilityBar';
