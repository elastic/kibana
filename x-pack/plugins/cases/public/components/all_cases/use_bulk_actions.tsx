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
import { ConfirmDeleteCaseModal } from '../confirm_delete_case';

interface UseBulkActionsProps {
  selectedCases: Case[];
  onAction: () => void;
}

interface UseBulkActionsReturnValue {
  actions: EuiContextMenuPanelItemDescriptor[];
  modals: JSX.Element;
}

export const useBulkActions = ({
  selectedCases,
  onAction,
}: UseBulkActionsProps): UseBulkActionsReturnValue => {
  const deleteAction = useBulkDeleteAction({ selectedCases, onAction });

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
    actions: [deleteAction.action],
  };
};
