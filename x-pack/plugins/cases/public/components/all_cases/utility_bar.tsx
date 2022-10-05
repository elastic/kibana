/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useCallback, useState } from 'react';
import { EuiContextMenu } from '@elastic/eui';
import {
  UtilityBar,
  UtilityBarAction,
  UtilityBarGroup,
  UtilityBarSection,
  UtilityBarText,
} from '../utility_bar';
import * as i18n from './translations';
import { Case } from '../../../common/ui/types';
import { useRefreshCases } from './use_on_refresh_cases';
import { UtilityBarBulkActions } from '../utility_bar/utility_bar_bulk_actions';
import { useBulkActions } from './use_bulk_actions';
import { useCasesContext } from '../cases_context/use_cases_context';

interface Props {
  isSelectorView?: boolean;
  totalCases: number;
  selectedCases: Case[];
  deselectCases: () => void;
}

export const CasesTableUtilityBar: FunctionComponent<Props> = React.memo(
  ({ isSelectorView, totalCases, selectedCases, deselectCases }) => {
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const togglePopover = useCallback(() => setIsPopoverOpen(!isPopoverOpen), [isPopoverOpen]);
    const closePopover = useCallback(() => setIsPopoverOpen(false), []);
    const refreshCases = useRefreshCases();
    const { permissions } = useCasesContext();

    const onRefresh = useCallback(() => {
      deselectCases();
      refreshCases();
    }, [deselectCases, refreshCases]);

    const { panels, modals } = useBulkActions({
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

    return (
      <>
        <UtilityBar border>
          <UtilityBarSection>
            <UtilityBarGroup>
              <UtilityBarText data-test-subj="case-table-case-count">
                {i18n.SHOWING_CASES(totalCases)}
              </UtilityBarText>
            </UtilityBarGroup>
            <UtilityBarGroup data-test-subj="case-table-utility-bar-actions">
              {!isSelectorView && showBulkActions && (
                <>
                  <UtilityBarText data-test-subj="case-table-selected-case-count">
                    {i18n.SHOWING_SELECTED_CASES(selectedCases.length)}
                  </UtilityBarText>
                  <UtilityBarBulkActions
                    dataTestSubj="case-table-bulk-actions"
                    iconSide="right"
                    iconType="arrowDown"
                    buttonTitle={i18n.BULK_ACTIONS}
                    isPopoverOpen={isPopoverOpen}
                    closePopover={closePopover}
                    onButtonClick={togglePopover}
                  >
                    <EuiContextMenu
                      panels={panels}
                      initialPanelId={0}
                      data-test-subj="case-table-bulk-actions-context-menu"
                    />
                  </UtilityBarBulkActions>
                </>
              )}
              <UtilityBarAction
                iconSide="left"
                iconType="refresh"
                onClick={onRefresh}
                dataTestSubj="all-cases-refresh"
              >
                {i18n.REFRESH}
              </UtilityBarAction>
            </UtilityBarGroup>
          </UtilityBarSection>
        </UtilityBar>
        {modals}
      </>
    );
  }
);

CasesTableUtilityBar.displayName = 'CasesTableUtilityBar';
