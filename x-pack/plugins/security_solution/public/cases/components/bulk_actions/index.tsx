/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiContextMenuItem } from '@elastic/eui';

import { CaseStatuses } from '../../../../../case/common/api';
import { CaseStatusWithAllStatus } from '../status';
import * as i18n from './translations';

interface GetBulkItems {
  caseStatus: CaseStatusWithAllStatus;
  closePopover: () => void;
  deleteCasesAction: (cases: string[]) => void;
  selectedCaseIds: string[];
  updateCaseStatus: (status: string) => void;
  includeCollections: boolean;
}

export const getBulkItems = ({
  caseStatus,
  closePopover,
  deleteCasesAction,
  selectedCaseIds,
  updateCaseStatus,
  includeCollections,
}: GetBulkItems) => {
  let statusMenuItems: JSX.Element[] = [];

  const openMenuItem = (
    <EuiContextMenuItem
      data-test-subj="cases-bulk-open-button"
      disabled={selectedCaseIds.length === 0 || includeCollections}
      key={i18n.BULK_ACTION_OPEN_SELECTED}
      icon="folderOpen"
      onClick={() => {
        closePopover();
        updateCaseStatus(CaseStatuses.open);
      }}
    >
      {i18n.BULK_ACTION_OPEN_SELECTED}
    </EuiContextMenuItem>
  );

  const closeMenuItem = (
    <EuiContextMenuItem
      data-test-subj="cases-bulk-close-button"
      disabled={selectedCaseIds.length === 0 || includeCollections}
      key={i18n.BULK_ACTION_CLOSE_SELECTED}
      icon="folderCheck"
      onClick={() => {
        closePopover();
        updateCaseStatus(CaseStatuses.closed);
      }}
    >
      {i18n.BULK_ACTION_CLOSE_SELECTED}
    </EuiContextMenuItem>
  );

  switch (caseStatus) {
    case CaseStatuses.open:
      statusMenuItems = [closeMenuItem];
      break;

    case CaseStatuses.closed:
      statusMenuItems = [openMenuItem];
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
