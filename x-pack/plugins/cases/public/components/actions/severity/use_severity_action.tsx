/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { EuiContextMenuPanelItemDescriptor } from '@elastic/eui';
import { CaseSeverity } from '../../../../common/api';
import { useUpdateCases } from '../../../containers/use_bulk_update_case';
import type { Case } from '../../../../common';

import * as i18n from './translations';
import type { UseActionProps } from '../types';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { severities } from '../../severity/config';

const getSeverityToasterMessage = (severity: CaseSeverity, cases: Case[]): string => {
  const totalCases = cases.length;
  const caseTitle = totalCases === 1 ? cases[0].title : '';

  switch (severity) {
    case CaseSeverity.LOW:
      return i18n.SET_SEVERITY_LOW({ totalCases, caseTitle });
    case CaseSeverity.MEDIUM:
      return i18n.SET_SEVERITY_MEDIUM({ totalCases, caseTitle });
    case CaseSeverity.HIGH:
      return i18n.SET_SEVERITY_HIGH({ totalCases, caseTitle });
    case CaseSeverity.CRITICAL:
      return i18n.SET_SEVERITY_CRITICAL({ totalCases, caseTitle });

    default:
      return '';
  }
};

interface UseSeverityActionProps extends UseActionProps {
  selectedSeverity?: CaseSeverity;
}

const shouldDisableSeverity = (cases: Case[], severity: CaseSeverity) =>
  cases.every((theCase) => theCase.severity === severity);

export const useSeverityAction = ({
  onAction,
  onActionSuccess,
  isDisabled,
  selectedSeverity,
}: UseSeverityActionProps) => {
  const { mutate: updateCases } = useUpdateCases();
  const { permissions } = useCasesContext();
  const canUpdateSeverity = permissions.update;
  const isActionDisabled = isDisabled || !canUpdateSeverity;

  const handleUpdateCaseSeverity = useCallback(
    (selectedCases: Case[], severity: CaseSeverity) => {
      onAction();
      const casesToUpdate = selectedCases.map((theCase) => ({
        severity,
        id: theCase.id,
        version: theCase.version,
      }));

      updateCases(
        {
          cases: casesToUpdate,
          successToasterTitle: getSeverityToasterMessage(severity, selectedCases),
        },
        { onSuccess: onActionSuccess }
      );
    },
    [onAction, updateCases, onActionSuccess]
  );

  const getSeverityIcon = (severity: CaseSeverity): string =>
    selectedSeverity && selectedSeverity === severity ? 'check' : 'empty';

  const getActions = (selectedCases: Case[]): EuiContextMenuPanelItemDescriptor[] => {
    return [
      {
        name: severities[CaseSeverity.LOW].label,
        icon: getSeverityIcon(CaseSeverity.LOW),
        onClick: () => handleUpdateCaseSeverity(selectedCases, CaseSeverity.LOW),
        disabled: isActionDisabled || shouldDisableSeverity(selectedCases, CaseSeverity.LOW),
        'data-test-subj': 'cases-bulk-action-severity-low',
        key: 'cases-bulk-action-severity-low',
      },
      {
        name: severities[CaseSeverity.MEDIUM].label,
        icon: getSeverityIcon(CaseSeverity.MEDIUM),
        onClick: () => handleUpdateCaseSeverity(selectedCases, CaseSeverity.MEDIUM),
        disabled: isActionDisabled || shouldDisableSeverity(selectedCases, CaseSeverity.MEDIUM),
        'data-test-subj': 'cases-bulk-action-severity-medium',
        key: 'cases-bulk-action-severity-medium',
      },
      {
        name: severities[CaseSeverity.HIGH].label,
        icon: getSeverityIcon(CaseSeverity.HIGH),
        onClick: () => handleUpdateCaseSeverity(selectedCases, CaseSeverity.HIGH),
        disabled: isActionDisabled || shouldDisableSeverity(selectedCases, CaseSeverity.HIGH),
        'data-test-subj': 'cases-bulk-action-severity-high',
        key: 'cases-bulk-action-severity-high',
      },
      {
        name: severities[CaseSeverity.CRITICAL].label,
        icon: getSeverityIcon(CaseSeverity.CRITICAL),
        onClick: () => handleUpdateCaseSeverity(selectedCases, CaseSeverity.CRITICAL),
        disabled: isActionDisabled || shouldDisableSeverity(selectedCases, CaseSeverity.CRITICAL),
        'data-test-subj': 'cases-bulk-action-severity-critical',
        key: 'cases-bulk-action-severity-critical',
      },
    ];
  };

  return { getActions, canUpdateSeverity };
};

export type UseSeverityAction = ReturnType<typeof useSeverityAction>;
