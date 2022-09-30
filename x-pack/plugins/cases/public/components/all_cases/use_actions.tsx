/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenu,
  EuiContextMenuPanelDescriptor,
  EuiPopover,
  EuiTableComputedColumnType,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { Case, CasesPermissions } from '../../containers/types';
import { useDeleteAction } from '../actions/delete/use_delete_action';
import { ConfirmDeleteCaseModal } from '../confirm_delete_case';
import { useStatusAction } from '../actions/status/use_status_action';
import { useRefreshCases } from './use_on_refresh_cases';
import * as i18n from './translations';
import { statuses } from '../status';

interface UseBulkActionsProps {
  permissions: CasesPermissions;
}

interface UseBulkActionsReturnValue {
  actions: EuiTableComputedColumnType<Case>;
}

const ActionColumnComponent: React.FC<{ theCase: Case; isDisabled: boolean }> = ({
  theCase,
  isDisabled,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const tooglePopover = useCallback(() => setIsPopoverOpen(!isPopoverOpen), [isPopoverOpen]);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);
  const refreshCases = useRefreshCases();
  const deleteAction = useDeleteAction({
    isDisabled,
    onAction: closePopover,
    onActionSuccess: refreshCases,
  });

  const statusAction = useStatusAction({
    isDisabled,
    onAction: closePopover,
    onActionSuccess: refreshCases,
    selectedStatus: theCase.status,
  });

  const getPanels = useCallback(
    (): EuiContextMenuPanelDescriptor[] => [
      {
        id: 0,
        title: i18n.ACTIONS,
        items: [
          {
            name: (
              <FormattedMessage
                defaultMessage="Status: {status}"
                id="xpack.cases.allCasesView.statusWithValue"
                values={{ status: <b>{statuses[theCase.status]?.label ?? '-'}</b> }}
              />
            ),
            panel: 1,
            disabled: isDisabled,
            key: `case-action-status-panel-${theCase.id}`,
            'data-test-subj': `case-action-status-panel-${theCase.id}`,
          },
          {
            isSeparator: true,
            key: `actions-separator-${theCase.id}`,
          },
          // TODO: permission check
          deleteAction.getAction([theCase]),
        ],
      },
      {
        id: 1,
        title: i18n.STATUS,
        items: statusAction.getActions([theCase]),
      },
    ],
    [deleteAction, isDisabled, statusAction, theCase]
  );

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
          />
        }
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
        anchorPosition="downLeft"
      >
        <EuiContextMenu
          initialPanelId={0}
          panels={getPanels()}
          key={`case-action-menu-${theCase.id}`}
        />
      </EuiPopover>
      {deleteAction.isModalVisible ? (
        <ConfirmDeleteCaseModal
          totalCasesToBeDeleted={1}
          onCancel={deleteAction.onCloseModal}
          onConfirm={deleteAction.onConfirmDeletion}
        />
      ) : null}
    </>
  );
};

ActionColumnComponent.displayName = 'ActionColumnComponent';

const ActionColumn = React.memo(ActionColumnComponent);

export const useActions = ({ permissions }: UseBulkActionsProps): UseBulkActionsReturnValue => {
  const isDisabled = !permissions.update;

  return {
    actions: {
      name: i18n.ACTIONS,
      align: 'right',
      render: (theCase: Case) => {
        return <ActionColumn theCase={theCase} key={theCase.id} isDisabled={isDisabled} />;
      },
    },
  };
};
