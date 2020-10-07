/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiOverlayMask, EuiConfirmModal } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

interface Props {
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmAlertSave: React.FC<Props> = ({ onConfirm, onCancel }) => {
  return (
    <EuiOverlayMask>
      <EuiConfirmModal
        title={i18n.translate(
          'xpack.triggersActionsUI.sections.confirmAlertSave.confirmAlertSaveTitle',
          {
            defaultMessage: 'Save Alert with no actions?',
          }
        )}
        onCancel={onCancel}
        onConfirm={onConfirm}
        confirmButtonText={i18n.translate(
          'xpack.triggersActionsUI.sections.confirmAlertSave.confirmAlertSaveConfirmButtonText',
          {
            defaultMessage: 'Save',
          }
        )}
        cancelButtonText={i18n.translate(
          'xpack.triggersActionsUI.sections.confirmAlertSave.confirmAlertSaveCancelButtonText',
          {
            defaultMessage: 'Cancel',
          }
        )}
        defaultFocusedButton="confirm"
        data-test-subj="confirmAlertSaveModal"
      >
        <p>
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.confirmAlertSave.confirmAlertSaveMessage"
            defaultMessage="Are you sure you want to save this alert without defining any actions?"
          />
        </p>
      </EuiConfirmModal>
    </EuiOverlayMask>
  );
};
