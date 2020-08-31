/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiTableActionsColumnType } from '@elastic/eui';

import { TransformListRow } from '../../../../common';

import { useCloneAction } from '../action_clone';
import { useDeleteAction, DeleteActionModal } from '../action_delete';
import { EditTransformFlyout } from '../edit_transform_flyout';
import { useEditAction } from '../action_edit';
import { useStartAction, StartActionModal } from '../action_start';
import { useStopAction } from '../action_stop';

export const useActions = ({
  forceDisable,
}: {
  forceDisable: boolean;
}): {
  actions: EuiTableActionsColumnType<TransformListRow>['actions'];
  modals: JSX.Element;
} => {
  const cloneAction = useCloneAction(forceDisable);
  const deleteAction = useDeleteAction(forceDisable);
  const editAction = useEditAction(forceDisable);
  const startAction = useStartAction(forceDisable);
  const stopAction = useStopAction(forceDisable);

  return {
    modals: (
      <>
        {startAction.isModalVisible && <StartActionModal {...startAction} />}
        {editAction.config && editAction.isFlyoutVisible && (
          <EditTransformFlyout closeFlyout={editAction.closeFlyout} config={editAction.config} />
        )}
        {deleteAction.isModalVisible && <DeleteActionModal {...deleteAction} />}
      </>
    ),
    actions: [
      startAction.action,
      stopAction.action,
      editAction.action,
      cloneAction.action,
      deleteAction.action,
    ],
  };
};
