/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiContextMenuItem } from '@elastic/eui';

import { CaseStatuses } from '../../../../../case/common/api';
import { statuses } from '../status';
import * as i18n from './translations';

interface GetBulkItems {
  caseStatus: CaseStatuses;
  closePopover: () => void;
  deleteCasesAction: (cases: string[]) => void;
  selectedCaseIds: string[];
  updateCaseStatus: (status: string) => void;
}

export const getBulkItems = ({
  caseStatus,
  closePopover,
  deleteCasesAction,
  selectedCaseIds,
  updateCaseStatus,
}: GetBulkItems) => {
  let statusMenuItems: JSX.Element[] = [];

  const openMenuItem = (
    <EuiContextMenuItem
      data-test-subj="cases-bulk-open-button"
      disabled={selectedCaseIds.length === 0}
      key="cases-bulk-open-button"
      icon={statuses[CaseStatuses.open].icon}
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
      disabled={selectedCaseIds.length === 0}
      key="cases-bulk-in-progress-button"
      icon={statuses[CaseStatuses['in-progress']].icon}
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
      disabled={selectedCaseIds.length === 0}
      key="cases-bulk-close-button"
      icon={statuses[CaseStatuses.closed].icon}
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
      disabled={selectedCaseIds.length === 0}
      onClick={() => {
        closePopover();
        deleteCasesAction(selectedCaseIds);
      }}
    >
      {i18n.BULK_ACTION_DELETE_SELECTED}
    </EuiContextMenuItem>,
  ];
};
