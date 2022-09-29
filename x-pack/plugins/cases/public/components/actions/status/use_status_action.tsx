/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { EuiContextMenuPanelItemDescriptor, EuiTableActionsColumnType } from '@elastic/eui';
import { useUpdateCases } from '../../../containers/use_bulk_update_case';
import { Case, CaseStatuses } from '../../../../common';

import * as i18n from './translations';
import { UseActionProps, UseBulkActionProps } from '../types';

const getStatusToasterMessage = (status: CaseStatuses, cases: Case[]): string => {
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

export const useBulkStatusAction = ({
  selectedCases,
  onAction,
  onActionSuccess,
  isDisabled,
}: UseBulkActionProps) => {
  const { mutate: updateCases } = useUpdateCases();

  const handleUpdateCaseStatus = useCallback(
    (status: CaseStatuses) => {
      onAction();
      const casesToUpdate = selectedCases.map((theCase) => ({
        status,
        id: theCase.id,
        version: theCase.version,
      }));

      updateCases(
        {
          cases: casesToUpdate,
          successToasterTitle: getStatusToasterMessage(status, selectedCases),
        },
        { onSuccess: onActionSuccess }
      );
    },
    [onAction, selectedCases, updateCases, onActionSuccess]
  );

  const actions: EuiContextMenuPanelItemDescriptor[] = useMemo(
    () => [
      {
        name: i18n.BULK_ACTION_STATUS_OPEN,
        icon: 'folderOpen',
        onClick: () => handleUpdateCaseStatus(CaseStatuses.open),
        disabled: isDisabled,
        'data-test-subj': 'cases-bulk-action-status-open',
        key: 'cases-bulk-action-status-open',
      },
      {
        name: i18n.BULK_ACTION_STATUS_IN_PROGRESS,
        icon: 'folderExclamation',
        onClick: () => handleUpdateCaseStatus(CaseStatuses['in-progress']),
        disabled: isDisabled,
        'data-test-subj': 'cases-bulk-action-status-in-progress',
        key: 'cases-bulk-action-status-in-progress',
      },
      {
        name: i18n.BULK_ACTION_STATUS_CLOSE,
        icon: 'folderCheck',
        onClick: () => handleUpdateCaseStatus(CaseStatuses.closed),
        disabled: isDisabled,
        'data-test-subj': 'cases-bulk-action-status-close',
        key: 'cases-bulk-status-action',
      },
    ],
    [handleUpdateCaseStatus, isDisabled]
  );

  return { actions };
};

export type UseBulkStatusAction = ReturnType<typeof useBulkStatusAction>;

export const useStatusAction = ({ onActionSuccess }: UseActionProps) => {
  const { mutate: updateCases } = useUpdateCases();

  const handleUpdateCaseStatus = useCallback(
    (theCase: Case, status: CaseStatuses) => {
      updateCases(
        {
          cases: [
            {
              status,
              id: theCase.id,
              version: theCase.version,
            },
          ],
          successToasterTitle: getStatusToasterMessage(status, [theCase]),
        },
        { onSuccess: onActionSuccess }
      );
    },
    [onActionSuccess, updateCases]
  );

  const actions: EuiTableActionsColumnType<Case>['actions'] = useMemo(
    () => [
      {
        name: i18n.OPEN_CASE,
        description: i18n.OPEN_CASE,
        icon: 'folderOpen',
        type: 'icon',
        isPrimary: false,
        onClick: (theCase) => handleUpdateCaseStatus(theCase, CaseStatuses.open),
        'data-test-subj': 'case-action-status-open',
        key: 'case-action-status-open',
      },
      {
        name: i18n.MARK_CASE_IN_PROGRESS,
        description: i18n.MARK_CASE_IN_PROGRESS,
        icon: 'folderExclamation',
        type: 'icon',
        isPrimary: false,
        onClick: (theCase) => handleUpdateCaseStatus(theCase, CaseStatuses['in-progress']),
        'data-test-subj': 'case-action-status-in-progress',
        key: 'case-action-status-progress',
      },
      {
        name: i18n.CLOSE_CASE,
        description: i18n.CLOSE_CASE,
        icon: 'folderCheck',
        type: 'icon',
        isPrimary: false,
        onClick: (theCase) => handleUpdateCaseStatus(theCase, CaseStatuses.closed),
        'data-test-subj': 'case-action-status-close',
        key: 'case-action-status-close',
      },
    ],
    [handleUpdateCaseStatus]
  );

  return { actions };
};

export type UseStatusAction = ReturnType<typeof useBulkStatusAction>;
