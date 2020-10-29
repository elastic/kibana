/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiContextMenuPanel } from '@elastic/eui';
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
  onRefresh: (refreshRule: boolean) => void;
  onGetBatchItemsPopoverContent: (closePopover: () => void) => JSX.Element[];
}

export const AllRulesUtilityBar = React.memo<AllRulesUtilityBarProps>(
  ({
    userHasNoPermissions,
    onRefresh,
    paginationTotal,
    numberSelectedRules,
    onGetBatchItemsPopoverContent,
  }) => {
    const handleGetBatchItemsPopoverContent = useCallback(
      (closePopover: () => void) => (
        <EuiContextMenuPanel items={onGetBatchItemsPopoverContent(closePopover)} />
      ),
      [onGetBatchItemsPopoverContent]
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
          </UtilityBarGroup>
        </UtilityBarSection>
      </UtilityBar>
    );
  }
);

AllRulesUtilityBar.displayName = 'AllRulesUtilityBar';
