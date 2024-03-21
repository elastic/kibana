/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiConfirmModal } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import * as labels from './translations';

interface Props {
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmAlertDeletion: React.FC<Props> = ({ onConfirm, onCancel }) => {
  return (
    <EuiConfirmModal
      title={labels.DISABLE_ANOMALY_ALERT}
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText="Cancel"
      confirmButtonText="Delete"
      buttonColor="danger"
      defaultFocusedButton="confirm"
      data-test-subj="uptimeMLAlertDeleteConfirmModel"
    >
      <p>
        <FormattedMessage
          id="xpack.uptime.monitorDetails.ml.confirmAlertDeleteMessage"
          defaultMessage="Are you sure you want to delete the alert for anomalies?"
        />
      </p>
    </EuiConfirmModal>
  );
};
