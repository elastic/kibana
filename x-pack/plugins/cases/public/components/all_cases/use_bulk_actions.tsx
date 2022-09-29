/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenuPanelItemDescriptor } from '@elastic/eui';
import React from 'react';

import { Case } from '../../containers/types';
import { useBulkDeleteAction } from '../actions/delete/use_delete_action';
import { useBulkStatusAction } from '../actions/status/use_status_action';
import { ConfirmDeleteCaseModal } from '../confirm_delete_case';

interface UseBulkActionsProps {
  selectedCases: Case[];
  onAction: () => void;
  onActionSuccess: () => void;
}

interface UseBulkActionsReturnValue {
  actions: EuiContextMenuPanelItemDescriptor[];
  modals: JSX.Element;
}

export const useBulkActions = ({
  selectedCases,
  onAction,
  onActionSuccess,
}: UseBulkActionsProps): UseBulkActionsReturnValue => {
  const isDisabled = selectedCases.length === 0;

  const deleteAction = useBulkDeleteAction({
    selectedCases,
    isDisabled,
    onAction,
    onActionSuccess,
  });

  const statusAction = useBulkStatusAction({
    selectedCases,
    isDisabled,
    onAction,
    onActionSuccess,
  });

  return {
    modals: (
      <>
        {deleteAction.isModalVisible ? (
          <ConfirmDeleteCaseModal
            totalCasesToBeDeleted={selectedCases.length}
            onCancel={deleteAction.onCloseModal}
            onConfirm={deleteAction.onConfirmDeletion}
          />
        ) : null}
      </>
    ),
    actions: [...statusAction.actions, deleteAction.action],
  };
};
