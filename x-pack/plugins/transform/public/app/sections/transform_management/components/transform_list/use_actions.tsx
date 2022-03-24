/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiTableActionsColumnType } from '@elastic/eui';

import { TransformListRow } from '../../../../common';

import { useCloneAction } from '../action_clone';
import { useDeleteAction, DeleteActionModal } from '../action_delete';
import { useDiscoverAction } from '../action_discover';
import { EditTransformFlyout } from '../edit_transform_flyout';
import { useEditAction } from '../action_edit';
import { useResetAction, ResetActionModal } from '../action_reset';
import { useStartAction, StartActionModal } from '../action_start';
import { useStopAction } from '../action_stop';
import { useCreateAlertRuleAction } from '../action_create_alert';
import { StopActionModal } from '../action_stop/stop_action_modal';

export const useActions = ({
  forceDisable,
  transformNodes,
}: {
  forceDisable: boolean;
  transformNodes: number;
}): {
  actions: EuiTableActionsColumnType<TransformListRow>['actions'];
  modals: JSX.Element;
} => {
  const cloneAction = useCloneAction(forceDisable, transformNodes);
  const deleteAction = useDeleteAction(forceDisable);
  const discoverAction = useDiscoverAction(forceDisable);
  const editAction = useEditAction(forceDisable, transformNodes);
  const resetAction = useResetAction(forceDisable);
  const startAction = useStartAction(forceDisable, transformNodes);
  const stopAction = useStopAction(forceDisable);
  const createAlertRuleAction = useCreateAlertRuleAction(forceDisable);

  return {
    modals: (
      <>
        {resetAction.isModalVisible && <ResetActionModal {...resetAction} />}
        {startAction.isModalVisible && <StartActionModal {...startAction} />}
        {stopAction.isModalVisible && <StopActionModal {...stopAction} />}

        {editAction.config && editAction.isFlyoutVisible && (
          <EditTransformFlyout
            closeFlyout={editAction.closeFlyout}
            config={editAction.config}
            indexPatternId={editAction.indexPatternId}
          />
        )}
        {deleteAction.isModalVisible && <DeleteActionModal {...deleteAction} />}
      </>
    ),
    actions: [
      discoverAction.action,
      createAlertRuleAction.action,
      startAction.action,
      stopAction.action,
      editAction.action,
      cloneAction.action,
      deleteAction.action,
      resetAction.action,
    ],
  };
};
