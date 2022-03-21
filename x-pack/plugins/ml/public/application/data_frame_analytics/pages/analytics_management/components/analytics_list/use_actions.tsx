/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiTableActionsColumnType } from '@elastic/eui';

import { checkPermission } from '../../../../../capabilities/check_capabilities';

import { DeleteSpaceAwareItemCheckModal } from '../../../../../components/delete_space_aware_item_check_modal';
import { useCloneAction } from '../action_clone';
import { useDeleteAction, DeleteActionModal } from '../action_delete';
import { isEditActionFlyoutVisible, useEditAction, EditActionFlyout } from '../action_edit';
import { useStartAction, StartActionModal } from '../action_start';
import { useStopAction, StopActionModal } from '../action_stop';
import { useViewAction } from '../action_view';
import { useMapAction } from '../action_map';

import { DataFrameAnalyticsListRow } from './common';
import { useRefreshAnalyticsList } from '../../../../common/analytics';

export const useActions = (
  isManagementTable: boolean
): {
  actions: EuiTableActionsColumnType<DataFrameAnalyticsListRow>['actions'];
  modals: JSX.Element | null;
} => {
  const canCreateDataFrameAnalytics: boolean = checkPermission('canCreateDataFrameAnalytics');
  const canDeleteDataFrameAnalytics: boolean = checkPermission('canDeleteDataFrameAnalytics');
  const canStartStopDataFrameAnalytics: boolean = checkPermission('canStartStopDataFrameAnalytics');

  const viewAction = useViewAction();
  const mapAction = useMapAction();
  const cloneAction = useCloneAction(canCreateDataFrameAnalytics);
  const deleteAction = useDeleteAction(canDeleteDataFrameAnalytics);
  const editAction = useEditAction(canStartStopDataFrameAnalytics);
  const startAction = useStartAction(canStartStopDataFrameAnalytics);
  const stopAction = useStopAction(canStartStopDataFrameAnalytics);

  const { refresh } = useRefreshAnalyticsList();

  let modals: JSX.Element | null = null;

  const actions: EuiTableActionsColumnType<DataFrameAnalyticsListRow>['actions'] = [
    viewAction.action,
    mapAction.action,
  ];

  // isManagementTable will be the same for the lifecycle of the component
  // Disabling lint error to fix console error in management list due to action hooks using deps not initialized in management
  if (isManagementTable === false) {
    modals = (
      <>
        {startAction.isModalVisible && <StartActionModal {...startAction} />}
        {stopAction.isModalVisible && <StopActionModal {...stopAction} />}
        {deleteAction.isDeleteJobCheckModalVisible && deleteAction?.item?.config && (
          <DeleteSpaceAwareItemCheckModal
            onCloseCallback={deleteAction.closeDeleteJobCheckModal}
            canDeleteCallback={() => {
              // Item will always be set by the time we open the delete modal
              deleteAction.openModal(deleteAction.item!);
              deleteAction.closeDeleteJobCheckModal();
            }}
            refreshJobsCallback={refresh}
            jobType={deleteAction.jobType}
            ids={[deleteAction.item.config.id]}
          />
        )}
        {deleteAction.isModalVisible && <DeleteActionModal {...deleteAction} />}
        {isEditActionFlyoutVisible(editAction) && <EditActionFlyout {...editAction} />}
      </>
    );

    actions.push(
      ...[
        startAction.action,
        stopAction.action,
        editAction.action,
        cloneAction.action,
        deleteAction.action,
      ]
    );
  }

  return { actions, modals };
};
