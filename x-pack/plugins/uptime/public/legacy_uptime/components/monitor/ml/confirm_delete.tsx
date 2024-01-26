/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiConfirmModal, EuiLoadingSpinner } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import * as labels from './translations';

interface Props {
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmJobDeletion: React.FC<Props> = ({ loading, onConfirm, onCancel }) => {
  return (
    <EuiConfirmModal
      title={labels.JOB_DELETION_CONFIRMATION}
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText="Cancel"
      confirmButtonText="Delete"
      buttonColor="danger"
      defaultFocusedButton="confirm"
      data-test-subj="uptimeMLJobDeleteConfirmModel"
    >
      {!loading ? (
        <p>
          <FormattedMessage
            id="xpack.uptime.monitorDetails.ml.confirmDeleteMessage"
            defaultMessage="Are you sure you want to delete this job?"
          />
        </p>
      ) : (
        <p>
          <FormattedMessage
            id="xpack.uptime.monitorDetails.ml.deleteMessage"
            defaultMessage="Deleting jobs..."
          />
          )
        </p>
      )}
      {!loading ? (
        <p>
          <FormattedMessage
            id="xpack.uptime.monitorDetails.ml.deleteJobWarning"
            defaultMessage="Deleting a job can be time consuming.
              It will be deleted in the background and data may not disappear instantly."
          />
        </p>
      ) : (
        <EuiLoadingSpinner size="xl" />
      )}
    </EuiConfirmModal>
  );
};
