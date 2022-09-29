/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTableActionsColumnType } from '@elastic/eui';
import { Case, CasesPermissions } from '../../containers/types';
import { useDeleteAction } from '../actions/delete/use_delete_action';
import { ConfirmDeleteCaseModal } from '../confirm_delete_case';
import { useStatusAction } from '../actions/status/use_status_action';
import { useRefreshCases } from './use_on_refresh_cases';

interface UseBulkActionsProps {
  permissions: CasesPermissions;
}

interface UseBulkActionsReturnValue {
  actions: EuiTableActionsColumnType<Case>['actions'];
  modals: JSX.Element;
}

export const useActions = ({ permissions }: UseBulkActionsProps): UseBulkActionsReturnValue => {
  const refreshCases = useRefreshCases();
  const deleteAction = useDeleteAction({ onActionSuccess: refreshCases });
  const statusAction = useStatusAction({ onActionSuccess: refreshCases });

  return {
    modals: (
      <>
        {deleteAction.isModalVisible ? (
          <ConfirmDeleteCaseModal
            totalCasesToBeDeleted={1}
            onCancel={deleteAction.onCloseModal}
            onConfirm={deleteAction.onConfirmDeletion}
          />
        ) : null}
      </>
    ),
    actions: [...statusAction.actions, ...(permissions.delete ? [deleteAction.action] : [])],
  };
};
