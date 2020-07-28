/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiTableActionsColumnType } from '@elastic/eui';

import { checkPermission } from '../../../../../capabilities/check_capabilities';

import { stopAnalytics } from '../../services/analytics_service';

import { useNavigateToWizardWithClonedJob, CloneButton } from '../action_clone';
import { useDeleteAction, DeleteButton, DeleteButtonModal } from '../action_delete';
import {
  isEditActionFlyoutVisible,
  useEditAction,
  EditButton,
  EditButtonFlyout,
} from '../action_edit';
import { useStartAction, StartButton, StartButtonModal } from '../action_start';
import { StopButton } from '../action_stop';
import { getViewAction } from '../action_view';

import {
  isCompletedAnalyticsJob,
  isDataFrameAnalyticsRunning,
  DataFrameAnalyticsListRow,
} from './common';

export const useActions = (
  isManagementTable: boolean
): {
  actions: EuiTableActionsColumnType<DataFrameAnalyticsListRow>['actions'];
  modals: JSX.Element | null;
} => {
  const canCreateDataFrameAnalytics: boolean = checkPermission('canCreateDataFrameAnalytics');
  const canDeleteDataFrameAnalytics: boolean = checkPermission('canDeleteDataFrameAnalytics');
  const canStartStopDataFrameAnalytics: boolean = checkPermission('canStartStopDataFrameAnalytics');

  let modals: JSX.Element | null = null;

  const actions: EuiTableActionsColumnType<DataFrameAnalyticsListRow>['actions'] = [
    getViewAction(isManagementTable),
  ];

  // isManagementTable will be the same for the lifecycle of the component
  // Disabling lint error to fix console error in management list due to action hooks using deps not initialized in management
  if (isManagementTable === false) {
    /* eslint-disable react-hooks/rules-of-hooks */
    const deleteAction = useDeleteAction();
    const editAction = useEditAction();
    const startAction = useStartAction();
    /* eslint-disable react-hooks/rules-of-hooks */

    modals = (
      <>
        {startAction.isModalVisible && <StartButtonModal {...startAction} />}
        {deleteAction.isModalVisible && <DeleteButtonModal {...deleteAction} />}
        {isEditActionFlyoutVisible(editAction) && <EditButtonFlyout {...editAction} />}
      </>
    );

    const startButtonEnabled = (item: DataFrameAnalyticsListRow) => {
      if (!isDataFrameAnalyticsRunning(item.stats.state)) {
        // Disable start for analytics jobs which have completed.
        const completeAnalytics = isCompletedAnalyticsJob(item.stats);
        return canStartStopDataFrameAnalytics && !completeAnalytics;
      }
      return canStartStopDataFrameAnalytics;
    };

    const navigateToWizardWithClonedJob = useNavigateToWizardWithClonedJob();

    actions.push(
      ...[
        {
          render: (item: DataFrameAnalyticsListRow) => {
            if (!isDataFrameAnalyticsRunning(item.stats.state)) {
              return (
                <StartButton
                  canStartStopDataFrameAnalytics={canStartStopDataFrameAnalytics}
                  isDisabled={!startButtonEnabled(item)}
                  item={item}
                  onClick={() => {
                    if (startButtonEnabled(item)) {
                      startAction.openModal(item);
                    }
                  }}
                />
              );
            }

            return (
              <StopButton
                isDisabled={!canStartStopDataFrameAnalytics}
                item={item}
                onClick={() => {
                  if (canStartStopDataFrameAnalytics) {
                    stopAnalytics(item);
                  }
                }}
              />
            );
          },
        },
        {
          render: (item: DataFrameAnalyticsListRow) => {
            return (
              <EditButton
                isDisabled={!canStartStopDataFrameAnalytics}
                onClick={() => {
                  if (canStartStopDataFrameAnalytics) {
                    editAction.openFlyout(item);
                  }
                }}
              />
            );
          },
        },
        {
          render: (item: DataFrameAnalyticsListRow) => {
            return (
              <DeleteButton
                isDisabled={
                  isDataFrameAnalyticsRunning(item.stats.state) || !canDeleteDataFrameAnalytics
                }
                item={item}
                onClick={() => {
                  if (canStartStopDataFrameAnalytics) {
                    deleteAction.openModal(item);
                  }
                }}
              />
            );
          },
        },
        {
          render: (item: DataFrameAnalyticsListRow) => {
            return (
              <CloneButton
                isDisabled={!canCreateDataFrameAnalytics}
                onClick={() => {
                  if (canCreateDataFrameAnalytics) {
                    navigateToWizardWithClonedJob(item);
                  }
                }}
              />
            );
          },
        },
      ]
    );
  }

  return { actions, modals };
};
