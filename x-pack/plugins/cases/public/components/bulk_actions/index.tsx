/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiContextMenuItem } from '@elastic/eui';

import { CaseStatusWithAllStatus } from '../../../common/ui/types';
import { CaseStatuses } from '../../../common/api';
import { statuses } from '../status';
import * as i18n from './translations';
import { Case } from '../../containers/types';

interface GetBulkItems {
  caseStatus: CaseStatusWithAllStatus;
  closePopover: () => void;
  deleteCasesAction: (cases: Case[]) => void;
  selectedCases: Case[];
  updateCaseStatus: (status: string) => void;
}

export const getBulkItems = ({
  caseStatus,
  closePopover,
  deleteCasesAction,
  selectedCases,
  updateCaseStatus,
}: GetBulkItems) => {
  let statusMenuItems: JSX.Element[] = [];

  const openMenuItem = (
    <EuiContextMenuItem
      data-test-subj="cases-bulk-open-button"
      disabled={selectedCases.length === 0}
      icon={statuses[CaseStatuses.open].icon}
      key="cases-bulk-open-button"
      onClick={() => {
        closePopover();
        updateCaseStatus(CaseStatuses.open);
      }}
    >
      {statuses[CaseStatuses.open].actions.bulk.title}
    </EuiContextMenuItem>
  );

  const inProgressMenuItem = (
    <EuiContextMenuItem
      data-test-subj="cases-bulk-in-progress-button"
      disabled={selectedCases.length === 0}
      icon={statuses[CaseStatuses['in-progress']].icon}
      key="cases-bulk-in-progress-button"
      onClick={() => {
        closePopover();
        updateCaseStatus(CaseStatuses['in-progress']);
      }}
    >
      {statuses[CaseStatuses['in-progress']].actions.bulk.title}
    </EuiContextMenuItem>
  );

  const closeMenuItem = (
    <EuiContextMenuItem
      data-test-subj="cases-bulk-close-button"
      disabled={selectedCases.length === 0}
      icon={statuses[CaseStatuses.closed].icon}
      key="cases-bulk-close-button"
      onClick={() => {
        closePopover();
        updateCaseStatus(CaseStatuses.closed);
      }}
    >
      {statuses[CaseStatuses.closed].actions.bulk.title}
    </EuiContextMenuItem>
  );

  switch (caseStatus) {
    case CaseStatuses.open:
      statusMenuItems = [inProgressMenuItem, closeMenuItem];
      break;

    case CaseStatuses['in-progress']:
      statusMenuItems = [openMenuItem, closeMenuItem];
      break;

    case CaseStatuses.closed:
      statusMenuItems = [openMenuItem, inProgressMenuItem];
      break;

    default:
      break;
  }

  return [
    ...statusMenuItems,
    <EuiContextMenuItem
      data-test-subj="cases-bulk-delete-button"
      key={i18n.BULK_ACTION_DELETE_SELECTED}
      icon="trash"
      disabled={selectedCases.length === 0}
      onClick={() => {
        closePopover();
        deleteCasesAction(selectedCases);
      }}
    >
      {i18n.BULK_ACTION_DELETE_SELECTED}
    </EuiContextMenuItem>,
  ];
};
