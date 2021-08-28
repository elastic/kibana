/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiTableActionsColumnType } from '@elastic/eui';
import React from 'react';
import { checkPermission } from '../../../../../capabilities/check_capabilities';
import { DeleteJobCheckModal } from '../../../../../components/delete_job_check_modal/delete_job_check_modal';
import { useRefreshAnalyticsList } from '../../../../common/analytics';
import { useCloneAction } from '../action_clone/use_clone_action';
import { DeleteActionModal } from '../action_delete/delete_action_modal';
import { useDeleteAction } from '../action_delete/use_delete_action';
import { EditActionFlyout } from '../action_edit/edit_action_flyout';
import { isEditActionFlyoutVisible, useEditAction } from '../action_edit/use_edit_action';
import { useMapAction } from '../action_map/use_map_action';
import { StartActionModal } from '../action_start/start_action_modal';
import { useStartAction } from '../action_start/use_start_action';
import { StopActionModal } from '../action_stop/stop_action_modal';
import { useStopAction } from '../action_stop/use_stop_action';
import { useViewAction } from '../action_view/use_view_action';
import type { DataFrameAnalyticsListRow } from './common';

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
          <DeleteJobCheckModal
            onCloseCallback={deleteAction.closeDeleteJobCheckModal}
            canDeleteCallback={() => {
              // Item will always be set by the time we open the delete modal
              deleteAction.openModal(deleteAction.item!);
              deleteAction.closeDeleteJobCheckModal();
            }}
            refreshJobsCallback={refresh}
            jobType={deleteAction.jobType}
            jobIds={[deleteAction.item.config.id]}
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
