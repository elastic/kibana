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
import { statuses } from '../../status';

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

interface UseStatusActionProps extends UseActionProps {
  selectedStatus?: CaseStatuses;
}

const getCasesWithChanges = (cases: Case[], status: CaseStatuses): Case[] =>
  cases.filter((theCase) => theCase.status !== status);

const disableStatus = (cases: Case[], status: CaseStatuses) =>
  getCasesWithChanges(cases, status).length === 0;

export const useStatusAction = ({
  onAction,
  onActionSuccess,
  isDisabled,
  selectedStatus,
}: UseStatusActionProps) => {
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

  const getStatusIcon = (status: CaseStatuses): string =>
    selectedStatus && selectedStatus === status ? 'check' : 'empty';

  const getActions = (selectedCases: Case[]): EuiContextMenuPanelItemDescriptor[] => {
    return [
      {
        name: statuses[CaseStatuses.open].label,
        icon: getStatusIcon(CaseStatuses.open),
        onClick: () => handleUpdateCaseStatus(selectedCases, CaseStatuses.open),
        disabled: isDisabled || disableStatus(selectedCases, CaseStatuses.open),
        'data-test-subj': 'cases-bulk-action-status-open',
        key: 'cases-bulk-action-status-open',
      },
      {
        name: statuses[CaseStatuses['in-progress']].label,
        icon: getStatusIcon(CaseStatuses['in-progress']),
        onClick: () => handleUpdateCaseStatus(selectedCases, CaseStatuses['in-progress']),
        disabled: isDisabled || disableStatus(selectedCases, CaseStatuses['in-progress']),
        'data-test-subj': 'cases-bulk-action-status-in-progress',
        key: 'cases-bulk-action-status-in-progress',
      },
      {
        name: statuses[CaseStatuses.closed].label,
        icon: getStatusIcon(CaseStatuses.closed),
        onClick: () => handleUpdateCaseStatus(selectedCases, CaseStatuses.closed),
        disabled: isDisabled || disableStatus(selectedCases, CaseStatuses.closed),
        'data-test-subj': 'cases-bulk-action-status-closed',
        key: 'cases-bulk-status-action',
      },
    ];
  };

  return { getActions };
};

export type UseStatusAction = ReturnType<typeof useStatusAction>;
