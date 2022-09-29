/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { EuiContextMenuPanelItemDescriptor } from '@elastic/eui';
import { useUpdateCases } from '../../../containers/use_bulk_update_case';
import { Case, CaseStatuses } from '../../../../common';

import * as i18n from './translations';
import { UseActionProps } from '../types';

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

export const useStatusAction = ({ onAction, onActionSuccess, isDisabled }: UseActionProps) => {
  const { mutate: updateCases } = useUpdateCases();

  const handleUpdateCaseStatus = useCallback(
    (selectedCases: Case[], status: CaseStatuses) => {
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
    [onAction, updateCases, onActionSuccess]
  );

  const getActions = (selectedCases: Case[]): EuiContextMenuPanelItemDescriptor[] => {
    return [
      {
        name: i18n.BULK_ACTION_STATUS_OPEN,
        icon: 'empty',
        onClick: () => handleUpdateCaseStatus(selectedCases, CaseStatuses.open),
        disabled: isDisabled,
        'data-test-subj': 'cases-bulk-action-status-open',
        key: 'cases-bulk-action-status-open',
      },
      {
        name: i18n.BULK_ACTION_STATUS_IN_PROGRESS,
        icon: 'empty',
        onClick: () => handleUpdateCaseStatus(selectedCases, CaseStatuses['in-progress']),
        disabled: isDisabled,
        'data-test-subj': 'cases-bulk-action-status-in-progress',
        key: 'cases-bulk-action-status-in-progress',
      },
      {
        name: i18n.BULK_ACTION_STATUS_CLOSE,
        icon: 'empty',
        onClick: () => handleUpdateCaseStatus(selectedCases, CaseStatuses.closed),
        disabled: isDisabled,
        'data-test-subj': 'cases-bulk-action-status-close',
        key: 'cases-bulk-status-action',
      },
    ];
  };

  return { getActions };
};

export type UseStatusAction = ReturnType<typeof useStatusAction>;
