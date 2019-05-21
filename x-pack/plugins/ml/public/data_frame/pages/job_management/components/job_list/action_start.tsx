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

import { DataFrameJobListRow } from './common';

interface StartActionProps {
  item: DataFrameJobListRow;
  startJob(d: DataFrameJobListRow): void;
}

export const StartAction: SFC<StartActionProps> = ({ startJob, item }) => {
  const canStartStopDataFrameJob: boolean = checkPermission('canStartStopDataFrameJob');

  const [isModalVisible, setModalVisible] = useState(false);

  const closeModal = () => setModalVisible(false);
  const startAndCloseModal = () => {
    setModalVisible(false);
    startJob(item);
  };
  const openModal = () => setModalVisible(true);

  const buttonStartText = i18n.translate('xpack.ml.dataframe.jobsList.startActionName', {
    defaultMessage: 'Start',
  });

  let startButton = (
    <EuiButtonEmpty
      size="xs"
      color="text"
      disabled={!canStartStopDataFrameJob}
      iconType="trash"
      onClick={openModal}
      aria-label={buttonStartText}
    >
      {buttonStartText}
    </EuiButtonEmpty>
  );

  if (!canStartStopDataFrameJob) {
    startButton = (
      <EuiToolTip
        position="top"
        content={createPermissionFailureMessage('canStartStopDataFrameJob')}
      >
        {startButton}
      </EuiToolTip>
    );
  }

  return (
    <Fragment>
      {startButton}
      {isModalVisible && (
        <EuiOverlayMask>
          <EuiConfirmModal
            title={i18n.translate('xpack.ml.dataframe.jobsList.startModalTitle', {
              defaultMessage: 'Start {jobId}',
              values: { jobId: item.config.id },
            })}
            onCancel={closeModal}
            onConfirm={startAndCloseModal}
            cancelButtonText={i18n.translate('xpack.ml.dataframe.jobsList.startModalCancelButton', {
              defaultMessage: 'Cancel',
            })}
            confirmButtonText={i18n.translate('xpack.ml.dataframe.jobsList.startModalStartButton', {
              defaultMessage: 'Start',
            })}
            defaultFocusedButton={EUI_MODAL_CONFIRM_BUTTON}
            buttonColor="danger"
          >
            <p>
              {i18n.translate('xpack.ml.dataframe.jobsList.startModalBody', {
                defaultMessage:
                  'A data frame job will increase search and indexing load in your cluster. Please stop the job if excessive load is experienced. Are you sure you want to start this job?',
              })}
            </p>
          </EuiConfirmModal>
        </EuiOverlayMask>
      )}
    </Fragment>
  );
};
