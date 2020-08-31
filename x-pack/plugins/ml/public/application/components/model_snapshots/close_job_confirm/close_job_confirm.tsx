/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n/react';

import { EuiOverlayMask, EuiConfirmModal } from '@elastic/eui';

import { COMBINED_JOB_STATE } from '../model_snapshots_table';

interface Props {
  combinedJobState: COMBINED_JOB_STATE;
  hideCloseJobModalVisible(): void;
  forceCloseJob(): void;
}
export const CloseJobConfirm: FC<Props> = ({
  combinedJobState,
  hideCloseJobModalVisible,
  forceCloseJob,
}) => {
  return (
    <EuiOverlayMask>
      <EuiConfirmModal
        title={
          combinedJobState === COMBINED_JOB_STATE.OPEN_AND_RUNNING
            ? i18n.translate('xpack.ml.modelSnapshotTable.closeJobConfirm.stopAndClose.title', {
                defaultMessage: 'Stop datafeed and close job?',
              })
            : i18n.translate('xpack.ml.modelSnapshotTable.closeJobConfirm.close.title', {
                defaultMessage: 'Close job?',
              })
        }
        onCancel={hideCloseJobModalVisible}
        onConfirm={forceCloseJob}
        cancelButtonText={i18n.translate(
          'xpack.ml.modelSnapshotTable.closeJobConfirm.cancelButton',
          {
            defaultMessage: 'Cancel',
          }
        )}
        confirmButtonText={
          combinedJobState === COMBINED_JOB_STATE.OPEN_AND_RUNNING
            ? i18n.translate('xpack.ml.modelSnapshotTable.closeJobConfirm.stopAndClose.button', {
                defaultMessage: 'Force stop and close',
              })
            : i18n.translate('xpack.ml.modelSnapshotTable.closeJobConfirm.close.button', {
                defaultMessage: 'Force close',
              })
        }
        defaultFocusedButton="confirm"
      >
        <p>
          {combinedJobState === COMBINED_JOB_STATE.OPEN_AND_RUNNING && (
            <FormattedMessage
              id="xpack.ml.modelSnapshotTable.closeJobConfirm.contentOpenAndRunning"
              defaultMessage="Job is currently open and running."
            />
          )}
          {combinedJobState === COMBINED_JOB_STATE.OPEN_AND_STOPPED && (
            <FormattedMessage
              id="xpack.ml.modelSnapshotTable.closeJobConfirm.contentOpen"
              defaultMessage="Job is currently open."
            />
          )}
          <br />
          <FormattedMessage
            id="xpack.ml.modelSnapshotTable.closeJobConfirm.content"
            defaultMessage="Snapshot revert can only happen on jobs which are closed."
          />
        </p>
      </EuiConfirmModal>
    </EuiOverlayMask>
  );
};
