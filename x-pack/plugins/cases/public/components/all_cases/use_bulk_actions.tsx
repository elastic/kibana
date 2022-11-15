/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EuiContextMenuPanelDescriptor,
  EuiContextMenuPanelItemDescriptor,
} from '@elastic/eui';
import React, { useMemo } from 'react';

import type { Case } from '../../containers/types';
import { useDeleteAction } from '../actions/delete/use_delete_action';
import { useSeverityAction } from '../actions/severity/use_severity_action';
import { useStatusAction } from '../actions/status/use_status_action';
import { EditTagsFlyout } from '../actions/tags/edit_tags_flyout';
import { useTagsAction } from '../actions/tags/use_tags_action';
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

  const severityAction = useSeverityAction({
    isDisabled,
    onAction,
    onActionSuccess,
  });

  const tagsAction = useTagsAction({
    isDisabled,
    onAction,
    onActionSuccess,
  });

  const canDelete = deleteAction.canDelete;
  const canUpdate = statusAction.canUpdateStatus;

  const panels = useMemo((): EuiContextMenuPanelDescriptor[] => {
    const mainPanelItems: EuiContextMenuPanelItemDescriptor[] = [];
    const panelsToBuild: EuiContextMenuPanelDescriptor[] = [
      { id: 0, items: mainPanelItems, title: i18n.ACTIONS },
    ];

    if (canUpdate) {
      mainPanelItems.push({
        name: i18n.STATUS,
        panel: 1,
        disabled: isDisabled,
        'data-test-subj': 'case-bulk-action-status',
        key: 'case-bulk-action-status',
      });

      mainPanelItems.push({
        name: i18n.SEVERITY,
        panel: 2,
        disabled: isDisabled,
        'data-test-subj': 'case-bulk-action-severity',
        key: 'case-bulk-action-severity',
      });
    }

    /**
     * A separator is added if a) there is one item above
     * and b) there is an item below. For this to happen the
     * user has to have delete and update permissions
     */
    if (canUpdate && canDelete) {
      mainPanelItems.push({
        isSeparator: true as const,
        key: 'bulk-actions-separator',
        'data-test-subj': 'bulk-actions-separator',
      });
    }

    if (canUpdate) {
      mainPanelItems.push(tagsAction.getAction(selectedCases));
    }

    if (canDelete) {
      mainPanelItems.push(deleteAction.getAction(selectedCases));
    }

    if (canUpdate) {
      panelsToBuild.push({
        id: 1,
        title: i18n.STATUS,
        items: statusAction.getActions(selectedCases),
      });

      panelsToBuild.push({
        id: 2,
        title: i18n.SEVERITY,
        items: severityAction.getActions(selectedCases),
      });
    }

    return panelsToBuild;
  }, [
    canDelete,
    canUpdate,
    deleteAction,
    isDisabled,
    selectedCases,
    severityAction,
    statusAction,
    tagsAction,
  ]);

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
        {tagsAction.isFlyoutOpen ? (
          <EditTagsFlyout
            onClose={tagsAction.onFlyoutClosed}
            selectedCases={selectedCases}
            onSaveTags={tagsAction.onSaveTags}
          />
        ) : null}
      </>
    ),
    panels,
  };
};
