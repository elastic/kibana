/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import React from 'react';

import { Case } from '../../containers/types';
import { useDeleteAction } from '../actions/delete/use_delete_action';
import { useStatusAction } from '../actions/status/use_status_action';
import { useCasesContext } from '../cases_context/use_cases_context';
import { ConfirmDeleteCaseModal } from '../confirm_delete_case';
import * as i18n from './translations';

interface UseBulkActionsProps {
  selectedCases: Case[];
  onAction: () => void;
  onActionSuccess: () => void;
}

interface UseBulkActionsReturnValue {
  panels: EuiContextMenuPanelDescriptor[];
  modals: JSX.Element;
}

export const useBulkActions = ({
  selectedCases,
  onAction,
  onActionSuccess,
}: UseBulkActionsProps): UseBulkActionsReturnValue => {
  const { permissions } = useCasesContext();
  const isDisabled = selectedCases.length === 0;
  const canDelete = permissions.delete;
  const canUpdate = permissions.update;

  const deleteAction = useDeleteAction({
    isDisabled: isDisabled || !canDelete,
    onAction,
    onActionSuccess,
  });

  const statusAction = useStatusAction({
    isDisabled: isDisabled || !canUpdate,
    onAction,
    onActionSuccess,
  });

  const panels: EuiContextMenuPanelDescriptor[] = [
    {
      id: 0,
      title: i18n.ACTIONS,
      items: [
        ...(canUpdate
          ? [
              {
                name: i18n.STATUS,
                panel: 1,
                disabled: isDisabled,
                'data-test-subj': 'case-bulk-action-status',
                key: 'case-bulk-action-status',
              },
            ]
          : []),
        /**
         * A separator is added if a) there is one item above
         * and b) there is an item below. For this to happen the
         * user has to have delete and update permissions
         */
        ...(canUpdate && canDelete
          ? [
              {
                isSeparator: true as const,
                key: 'bulk-actions-separator',
                'data-test-subj': 'bulk-actions-separator',
              },
            ]
          : []),
        ...(canDelete ? [deleteAction.getAction(selectedCases)] : []),
      ],
    },
    ...(canUpdate
      ? [
          {
            id: 1,
            title: i18n.STATUS,
            items: statusAction.getActions(selectedCases),
          },
        ]
      : []),
  ];

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
    panels,
  };
};
