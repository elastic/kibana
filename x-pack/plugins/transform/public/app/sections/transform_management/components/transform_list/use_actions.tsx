/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { EuiTableActionsColumnType } from '@elastic/eui';

import { ReauthorizeActionModal, useReauthorizeAction } from '../action_reauthorize';
import type { TransformListRow } from '../../../../common';

import { useCloneAction } from '../action_clone';
import { useDeleteAction, DeleteActionModal } from '../action_delete';
import { useDiscoverAction } from '../action_discover';
import { EditTransformFlyout } from '../../../edit_transform';
import { useEditAction } from '../action_edit';
import { useResetAction, ResetActionModal } from '../action_reset';
import { useScheduleNowAction } from '../action_schedule_now';
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
  const reauthorizeAction = useReauthorizeAction(forceDisable, transformNodes);
  const resetAction = useResetAction(forceDisable);
  const scheduleNowAction = useScheduleNowAction(forceDisable, transformNodes);
  const startAction = useStartAction(forceDisable, transformNodes);
  const stopAction = useStopAction(forceDisable);
  const createAlertRuleAction = useCreateAlertRuleAction(forceDisable);

  return {
    modals: (
      <>
        {resetAction.isModalVisible && <ResetActionModal {...resetAction} />}
        {startAction.isModalVisible && <StartActionModal {...startAction} />}
        {stopAction.isModalVisible && <StopActionModal {...stopAction} />}
        {reauthorizeAction.isModalVisible && <ReauthorizeActionModal {...reauthorizeAction} />}
        <EditTransformFlyout {...editAction} />
        {deleteAction.isModalVisible && <DeleteActionModal {...deleteAction} />}
      </>
    ),
    actions: [
      discoverAction.action,
      createAlertRuleAction.action,
      scheduleNowAction.action,
      startAction.action,
      stopAction.action,
      editAction.action,
      cloneAction.action,
      deleteAction.action,
      reauthorizeAction.action,
      resetAction.action,
    ],
  };
};
