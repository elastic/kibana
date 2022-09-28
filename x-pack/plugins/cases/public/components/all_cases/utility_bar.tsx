/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useCallback, useState } from 'react';
import { EuiContextMenu } from '@elastic/eui';
import { CaseStatuses } from '../../../common';
import {
  UtilityBar,
  UtilityBarAction,
  UtilityBarGroup,
  UtilityBarSection,
  UtilityBarText,
} from '../utility_bar';
import * as i18n from './translations';
import { Cases, Case, FilterOptions } from '../../../common/ui/types';
import { useUpdateCases } from '../../containers/use_bulk_update_case';
import { useRefreshCases } from './use_on_refresh_cases';
import { UtilityBarBulkActions } from '../utility_bar/utility_bar_bulk_actions';
import { useBulkActions } from './use_bulk_actions';

interface Props {
  data: Cases;
  enableBulkActions: boolean;
  filterOptions: FilterOptions;
  selectedCases: Case[];
  deselectCases: () => void;
}

export const getStatusToasterMessage = (status: CaseStatuses, cases: Case[]): string => {
  const totalCases = cases.length;
  const caseTitle = totalCases === 1 ? cases[0].title : '';

  if (status === CaseStatuses.open) {
    return i18n.REOPENED_CASES({ totalCases, caseTitle });
  } else if (status === CaseStatuses['in-progress']) {
    return i18n.MARK_IN_PROGRESS_CASES({ totalCases, caseTitle });
  } else if (status === CaseStatuses.closed) {
    return i18n.CLOSED_CASES({ totalCases, caseTitle });
  }

  return '';
};

export const CasesTableUtilityBar: FunctionComponent<Props> = ({
  data,
  enableBulkActions = false,
  filterOptions,
  selectedCases,
  deselectCases,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const togglePopover = useCallback(() => setIsPopoverOpen(!isPopoverOpen), [isPopoverOpen]);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);
  const refreshCases = useRefreshCases();

  const { mutate: updateCases } = useUpdateCases();

  const handleUpdateCaseStatus = useCallback(
    (status: CaseStatuses) => {
      const casesToUpdate = selectedCases.map((theCase) => ({
        status,
        id: theCase.id,
        version: theCase.version,
      }));

      updateCases({
        cases: casesToUpdate,
        successToasterTitle: getStatusToasterMessage(status, selectedCases),
      });
    },
    [selectedCases, updateCases]
  );

  const onRefresh = useCallback(() => {
    deselectCases();
    refreshCases();
  }, [deselectCases, refreshCases]);

  const { actions, modals } = useBulkActions({
    selectedCases,
    onAction: closePopover,
  });

  const panels = [{ id: 0, items: actions }];

  return (
    <>
      <UtilityBar border>
        <UtilityBarSection>
          <UtilityBarGroup>
            <UtilityBarText data-test-subj="case-table-case-count">
              {i18n.SHOWING_CASES(data.total ?? 0)}
            </UtilityBarText>
          </UtilityBarGroup>
          <UtilityBarGroup data-test-subj="case-table-utility-bar-actions">
            {enableBulkActions && (
              <>
                <UtilityBarText data-test-subj="case-table-selected-case-count">
                  {i18n.SHOWING_SELECTED_CASES(selectedCases.length)}
                </UtilityBarText>
                <UtilityBarBulkActions
                  data-test-subj="case-table-bulk-actions"
                  iconSide="right"
                  iconType="arrowDown"
                  buttonTitle={i18n.BULK_ACTIONS}
                  isPopoverOpen={isPopoverOpen}
                  closePopover={closePopover}
                  onButtonClick={togglePopover}
                >
                  <EuiContextMenu panels={panels} initialPanelId={0} />
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
};
CasesTableUtilityBar.displayName = 'CasesTableUtilityBar';
