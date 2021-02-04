/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiOverlayMask, EuiConfirmModal } from '@elastic/eui';

interface Props {
  message?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ManageLicenseModal: React.FC<Props> = ({ message, onConfirm, onCancel }) => {
  return (
    <EuiOverlayMask>
      <EuiConfirmModal
        title={i18n.translate('xpack.triggersActionsUI.sections.manageLicense.manageLicenseTitle', {
          defaultMessage: 'Upgrade license?',
        })}
        onCancel={onCancel}
        onConfirm={onConfirm}
        confirmButtonText={i18n.translate(
          'xpack.triggersActionsUI.sections.manageLicense.manageLicenseConfirmButtonText',
          {
            defaultMessage: 'Manage license',
          }
        )}
        cancelButtonText={i18n.translate(
          'xpack.triggersActionsUI.sections.manageLicense.manageLicenseCancelButtonText',
          {
            defaultMessage: 'Cancel',
          }
        )}
        defaultFocusedButton="confirm"
        data-test-subj="manageLicenseModal"
      >
        <p>{message}</p>
      </EuiConfirmModal>
    </EuiOverlayMask>
  );
};
