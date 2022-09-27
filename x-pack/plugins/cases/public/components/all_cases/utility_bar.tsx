/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useCallback, useState } from 'react';
import { EuiContextMenuPanel } from '@elastic/eui';
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
import { getBulkItems } from '../bulk_actions';
import { useDeleteCases } from '../../containers/use_delete_cases';
import { ConfirmDeleteCaseModal } from '../confirm_delete_case';
import { useUpdateCases } from '../../containers/use_bulk_update_case';
import { useRefreshCases } from './use_on_refresh_cases';

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
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const onCloseModal = useCallback(() => setIsModalVisible(false), []);
  const refreshCases = useRefreshCases();

  const { mutate: deleteCases } = useDeleteCases();
  const { mutate: updateCases } = useUpdateCases();

  const toggleBulkDeleteModal = useCallback((cases: Case[]) => {
    setIsModalVisible(true);
  }, []);

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

  const getBulkItemsPopoverContent = useCallback(
    (closePopover: () => void) => (
      <EuiContextMenuPanel
        data-test-subj="cases-bulk-actions"
        items={getBulkItems({
          caseStatus: filterOptions.status,
          closePopover,
          deleteCasesAction: toggleBulkDeleteModal,
          selectedCases,
          updateCaseStatus: handleUpdateCaseStatus,
        })}
      />
    ),
    [selectedCases, filterOptions.status, toggleBulkDeleteModal, handleUpdateCaseStatus]
  );

  const onConfirmDeletion = useCallback(() => {
    setIsModalVisible(false);
    deleteCases({
      caseIds: selectedCases.map(({ id }) => id),
      successToasterTitle: i18n.DELETED_CASES(selectedCases.length),
    });
  }, [deleteCases, selectedCases]);

  const onRefresh = useCallback(() => {
    deselectCases();
    refreshCases();
  }, [deselectCases, refreshCases]);

  return (
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

              <UtilityBarAction
                data-test-subj="case-table-bulk-actions"
                iconSide="right"
                iconType="arrowDown"
                popoverContent={getBulkItemsPopoverContent}
              >
                {i18n.BULK_ACTIONS}
              </UtilityBarAction>
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
      {isModalVisible ? (
        <ConfirmDeleteCaseModal
          totalCasesToBeDeleted={selectedCases.length}
          onCancel={onCloseModal}
          onConfirm={onConfirmDeletion}
        />
      ) : null}
    </UtilityBar>
  );
};
CasesTableUtilityBar.displayName = 'CasesTableUtilityBar';
