/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type {
  EuiContextMenuPanelDescriptor,
  EuiContextMenuPanelItemDescriptor,
  EuiTableComputedColumnType,
} from '@elastic/eui';
import { EuiButtonIcon, EuiContextMenu, EuiPopover } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { Case } from '../../containers/types';
import { useDeleteAction } from '../actions/delete/use_delete_action';
import { ConfirmDeleteCaseModal } from '../confirm_delete_case';
import { useStatusAction } from '../actions/status/use_status_action';
import { useRefreshCases } from './use_on_refresh_cases';
import * as i18n from './translations';
import { statuses } from '../status';
import { useCasesContext } from '../cases_context/use_cases_context';
import { useSeverityAction } from '../actions/severity/use_severity_action';
import { severities } from '../severity/config';
import { useTagsAction } from '../actions/tags/use_tags_action';
import { EditTagsFlyout } from '../actions/tags/edit_tags_flyout';
import { useAssigneesAction } from '../actions/assignees/use_assignees_action';
import { EditAssigneesFlyout } from '../actions/assignees/edit_assignees_flyout';
import { useCopyIDAction } from '../actions/copy_id/use_copy_id_action';

const ActionColumnComponent: React.FC<{ theCase: Case; disableActions: boolean }> = ({
  theCase,
  disableActions,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const tooglePopover = useCallback(() => setIsPopoverOpen(!isPopoverOpen), [isPopoverOpen]);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);
  const refreshCases = useRefreshCases();

  const deleteAction = useDeleteAction({
    isDisabled: false,
    onAction: closePopover,
    onActionSuccess: refreshCases,
  });

  const copyIDAction = useCopyIDAction({
    onActionSuccess: closePopover,
  });

  const statusAction = useStatusAction({
    isDisabled: false,
    onAction: closePopover,
    onActionSuccess: refreshCases,
    selectedStatus: theCase.status,
  });

  const severityAction = useSeverityAction({
    isDisabled: false,
    onAction: closePopover,
    onActionSuccess: refreshCases,
    selectedSeverity: theCase.severity,
  });

  const tagsAction = useTagsAction({
    isDisabled: false,
    onAction: closePopover,
    onActionSuccess: refreshCases,
  });

  const assigneesAction = useAssigneesAction({
    isDisabled: false,
    onAction: closePopover,
    onActionSuccess: refreshCases,
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
        name: (
          <FormattedMessage
            defaultMessage="Status: {status}"
            id="xpack.cases.allCasesView.statusWithValue"
            values={{ status: <b>{statuses[theCase.status]?.label ?? '-'}</b> }}
          />
        ),
        panel: 1,
        disabled: !canUpdate,
        key: `case-action-status-panel-${theCase.id}`,
        'data-test-subj': `case-action-status-panel-${theCase.id}`,
      });

      mainPanelItems.push({
        name: (
          <FormattedMessage
            defaultMessage="Severity: {severity}"
            id="xpack.cases.allCasesView.severityWithValue"
            values={{ severity: <b>{severities[theCase.severity]?.label ?? '-'}</b> }}
          />
        ),
        panel: 2,
        disabled: !canUpdate,
        key: `case-action-severity-panel-${theCase.id}`,
        'data-test-subj': `case-action-severity-panel-${theCase.id}`,
      });
    }

    /**
     * A separator is added if a) there is one item above
     * and b) there is an item below. For this to happen the
     * user has to have delete and update permissions
     */
    if (canUpdate && canDelete) {
      mainPanelItems.push({
        isSeparator: true,
        key: `actions-separator-${theCase.id}`,
        'data-test-subj': `actions-separator-${theCase.id}`,
      });
    }

    if (canUpdate) {
      mainPanelItems.push(tagsAction.getAction([theCase]));
      mainPanelItems.push(assigneesAction.getAction([theCase]));
    }

    mainPanelItems.push(copyIDAction.getAction(theCase));

    if (canDelete) {
      mainPanelItems.push(deleteAction.getAction([theCase]));
    }

    if (canUpdate) {
      panelsToBuild.push({
        id: 1,
        title: i18n.STATUS,
        items: statusAction.getActions([theCase]),
      });

      panelsToBuild.push({
        id: 2,
        title: i18n.SEVERITY,
        items: severityAction.getActions([theCase]),
      });
    }

    return panelsToBuild;
  }, [
    assigneesAction,
    canDelete,
    canUpdate,
    copyIDAction,
    deleteAction,
    severityAction,
    statusAction,
    tagsAction,
    theCase,
  ]);

  return (
    <>
      <EuiPopover
        id={`case-action-popover-${theCase.id}`}
        key={`case-action-popover-${theCase.id}`}
        data-test-subj={`case-action-popover-${theCase.id}`}
        button={
          <EuiButtonIcon
            onClick={tooglePopover}
            iconType="boxesHorizontal"
            aria-label={i18n.ACTIONS}
            color="text"
            key={`case-action-popover-button-${theCase.id}`}
            data-test-subj={`case-action-popover-button-${theCase.id}`}
            disabled={disableActions}
          />
        }
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
        anchorPosition="downLeft"
      >
        <EuiContextMenu initialPanelId={0} panels={panels} key={`case-action-menu-${theCase.id}`} />
      </EuiPopover>
      {deleteAction.isModalVisible ? (
        <ConfirmDeleteCaseModal
          totalCasesToBeDeleted={1}
          onCancel={deleteAction.onCloseModal}
          onConfirm={deleteAction.onConfirmDeletion}
        />
      ) : null}
      {tagsAction.isFlyoutOpen ? (
        <EditTagsFlyout
          onClose={tagsAction.onFlyoutClosed}
          selectedCases={[theCase]}
          onSaveTags={tagsAction.onSaveTags}
        />
      ) : null}
      {assigneesAction.isFlyoutOpen ? (
        <EditAssigneesFlyout
          onClose={assigneesAction.onFlyoutClosed}
          selectedCases={[theCase]}
          onSaveAssignees={assigneesAction.onSaveAssignees}
        />
      ) : null}
    </>
  );
};

ActionColumnComponent.displayName = 'ActionColumnComponent';

const ActionColumn = React.memo(ActionColumnComponent);

interface UseBulkActionsReturnValue {
  actions: EuiTableComputedColumnType<Case> | null;
}

interface UseBulkActionsProps {
  disableActions: boolean;
}

export const useActions = ({ disableActions }: UseBulkActionsProps): UseBulkActionsReturnValue => {
  const { permissions } = useCasesContext();
  const shouldShowActions = permissions.update || permissions.delete;

  return {
    actions: shouldShowActions
      ? {
          name: i18n.ACTIONS,
          align: 'right',
          render: (theCase: Case) => {
            return (
              <ActionColumn theCase={theCase} key={theCase.id} disableActions={disableActions} />
            );
          },
        }
      : null,
  };
};
