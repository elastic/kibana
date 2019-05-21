/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, SFC, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonEmpty,
  EuiConfirmModal,
  EuiOverlayMask,
  EuiToolTip,
  EUI_MODAL_CONFIRM_BUTTON,
} from '@elastic/eui';

import {
  checkPermission,
  createPermissionFailureMessage,
} from '../../../../../privilege/check_privilege';

import { DataFrameJobListRow, DATA_FRAME_RUNNING_STATE } from './common';
import { deleteJobFactory, startJobFactory, stopJobFactory } from './job_service';

interface DeleteActionProps {
  disabled: boolean;
  item: DataFrameJobListRow;
  deleteJob(d: DataFrameJobListRow): void;
}

export const DeleteAction: SFC<DeleteActionProps> = ({ deleteJob, disabled, item }) => {
  const canDeleteDataFrameJob: boolean = checkPermission('canDeleteDataFrameJob');

  const [isModalVisible, setModalVisible] = useState(false);

  const closeModal = () => setModalVisible(false);
  const deleteAndCloseModal = () => {
    setModalVisible(false);
    deleteJob(item);
  };
  const openModal = () => setModalVisible(true);

  const buttonDeleteText = i18n.translate('xpack.ml.dataframe.jobsList.deleteActionName', {
    defaultMessage: 'Delete',
  });

  let deleteButton = (
    <EuiButtonEmpty
      size="xs"
      color="text"
      disabled={disabled || !canDeleteDataFrameJob}
      iconType="trash"
      onClick={openModal}
      aria-label={buttonDeleteText}
    >
      {buttonDeleteText}
    </EuiButtonEmpty>
  );

  if (disabled || !canDeleteDataFrameJob) {
    deleteButton = (
      <EuiToolTip
        position="top"
        content={
          disabled
            ? i18n.translate('xpack.ml.dataframe.jobsList.deleteActionDisabledToolTipContent', {
                defaultMessage: 'Stop the data frame job in order to delete it.',
              })
            : createPermissionFailureMessage('canStartStopDataFrameJob')
        }
      >
        {deleteButton}
      </EuiToolTip>
    );
  }

  return (
    <Fragment>
      {deleteButton}
      {isModalVisible && (
        <EuiOverlayMask>
          <EuiConfirmModal
            title={i18n.translate('xpack.ml.dataframe.jobsList.deleteModalTitle', {
              defaultMessage: 'Delete {jobId}',
              values: { jobId: item.config.id },
            })}
            onCancel={closeModal}
            onConfirm={deleteAndCloseModal}
            cancelButtonText={i18n.translate(
              'xpack.ml.dataframe.jobsList.deleteModalCancelButton',
              {
                defaultMessage: 'Cancel',
              }
            )}
            confirmButtonText={i18n.translate(
              'xpack.ml.dataframe.jobsList.deleteModalDeleteButton',
              {
                defaultMessage: 'Delete',
              }
            )}
            defaultFocusedButton={EUI_MODAL_CONFIRM_BUTTON}
            buttonColor="danger"
          >
            <p>
              {i18n.translate('xpack.ml.dataframe.jobsList.deleteModalBody', {
                defaultMessage: 'Are you sure you want to delete this job?',
              })}
            </p>
          </EuiConfirmModal>
        </EuiOverlayMask>
      )}
    </Fragment>
  );
};

export const getActions = (getJobs: () => void) => {
  const canStartStopDataFrameJob: boolean = checkPermission('canStartStopDataFrameJob');

  const deleteJob = deleteJobFactory(getJobs);
  const startJob = startJobFactory(getJobs);
  const stopJob = stopJobFactory(getJobs);

  return [
    {
      isPrimary: true,
      render: (item: DataFrameJobListRow) => {
        if (item.state.task_state !== DATA_FRAME_RUNNING_STATE.STARTED) {
          const buttonStartText = i18n.translate('xpack.ml.dataframe.jobsList.startActionName', {
            defaultMessage: 'Start',
          });

          const startButton = (
            <EuiButtonEmpty
              size="xs"
              color="text"
              disabled={!canStartStopDataFrameJob}
              iconType="play"
              onClick={() => startJob(item)}
              aria-label={buttonStartText}
            >
              {buttonStartText}
            </EuiButtonEmpty>
          );

          if (!canStartStopDataFrameJob) {
            return (
              <EuiToolTip
                position="top"
                content={createPermissionFailureMessage('canStartStopDataFrameJob')}
              >
                {startButton}
              </EuiToolTip>
            );
          }

          return startButton;
        }

        const buttonStopText = i18n.translate('xpack.ml.dataframe.jobsList.stopActionName', {
          defaultMessage: 'Stop',
        });

        const stopButton = (
          <EuiButtonEmpty
            size="xs"
            color="text"
            disabled={!canStartStopDataFrameJob}
            iconType="stop"
            onClick={() => stopJob(item)}
            aria-label={buttonStopText}
          >
            {buttonStopText}
          </EuiButtonEmpty>
        );
        if (!canStartStopDataFrameJob) {
          return (
            <EuiToolTip
              position="top"
              content={createPermissionFailureMessage('canStartStopDataFrameJob')}
            >
              {stopButton}
            </EuiToolTip>
          );
        }

        return stopButton;
      },
    },
    {
      render: (item: DataFrameJobListRow) => {
        return (
          <DeleteAction
            deleteJob={deleteJob}
            disabled={item.state.task_state === DATA_FRAME_RUNNING_STATE.STARTED}
            item={item}
          />
        );
      },
    },
  ];
};
