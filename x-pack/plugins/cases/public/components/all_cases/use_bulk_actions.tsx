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
  const isDisabled = selectedCases.length === 0;

  const deleteAction = useDeleteAction({
    isDisabled,
    onAction,
    onActionSuccess,
  });

  const statusAction = useStatusAction({
    isDisabled,
    onAction,
    onActionSuccess,
  });

  const panels: EuiContextMenuPanelDescriptor[] = [
    {
      id: 0,
      title: i18n.ACTIONS,
      items: [
        { name: i18n.STATUS, panel: 1, disabled: isDisabled },
        {
          isSeparator: true,
          key: 'actions-separator',
        },
        // TODO: permission check
        deleteAction.getAction(selectedCases),
      ],
    },
    {
      id: 1,
      title: i18n.STATUS,
      items: statusAction.getActions(selectedCases),
    },
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
