/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useCallback, useState } from 'react';
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
import type { Case } from '../../../common/ui/types';
import { useRefreshCases } from './use_on_refresh_cases';
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
    const { euiTheme } = useEuiTheme();
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const togglePopover = useCallback(() => setIsPopoverOpen(!isPopoverOpen), [isPopoverOpen]);
    const closePopover = useCallback(() => setIsPopoverOpen(false), []);
    const refreshCases = useRefreshCases();
    const { permissions } = useCasesContext();

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
              {i18n.SHOWING_CASES(totalCases)}
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
      </>
    );
  }
);

CasesTableUtilityBar.displayName = 'CasesTableUtilityBar';
