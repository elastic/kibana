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
  EUI_MODAL_CONFIRM_BUTTON,
} from '@elastic/eui';

import { DataFrameJobListRow, DATA_FRAME_RUNNING_STATE } from './common';
import { deleteJobFactory, startJobFactory, stopJobFactory } from './job_service';

interface DeleteActionProps {
  disabled: boolean;
  item: DataFrameJobListRow;
  deleteJob(d: DataFrameJobListRow): void;
}

const DeleteAction: SFC<DeleteActionProps> = ({ deleteJob, disabled, item }) => {
  const [isModalVisible, setModalVisible] = useState(false);

  const closeModal = () => setModalVisible(false);
  const deleteAndCloseModal = () => {
    setModalVisible(false);
    deleteJob(item);
  };
  const openModal = () => setModalVisible(true);

  return (
    <Fragment>
      <EuiButtonEmpty
        color="danger"
        disabled={disabled}
        iconType="trash"
        onClick={openModal}
        aria-label={i18n.translate('xpack.ml.dataframe.jobsList.deleteActionName', {
          defaultMessage: 'Delete',
        })}
      />
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
  const deleteJob = deleteJobFactory(getJobs);
  const startJob = startJobFactory(getJobs);
  const stopJob = stopJobFactory(getJobs);

  return [
    {
      isPrimary: true,
      render: (item: DataFrameJobListRow) => {
        if (
          item.state.indexer_state !== DATA_FRAME_RUNNING_STATE.STARTED &&
          item.state.task_state !== DATA_FRAME_RUNNING_STATE.STARTED
        ) {
          return (
            <EuiButtonEmpty
              iconType="play"
              onClick={() => startJob(item)}
              aria-label={i18n.translate('xpack.ml.dataframe.jobsList.startActionName', {
                defaultMessage: 'Start',
              })}
            />
          );
        }

        return (
          <EuiButtonEmpty
            color="danger"
            iconType="stop"
            onClick={() => stopJob(item)}
            aria-label={i18n.translate('xpack.ml.dataframe.jobsList.stopActionName', {
              defaultMessage: 'Stop',
            })}
          />
        );
      },
    },
    {
      render: (item: DataFrameJobListRow) => {
        return (
          <DeleteAction
            deleteJob={deleteJob}
            disabled={
              item.state.indexer_state === DATA_FRAME_RUNNING_STATE.STARTED ||
              item.state.task_state === DATA_FRAME_RUNNING_STATE.STARTED
            }
            item={item}
          />
        );
      },
    },
  ];
};
