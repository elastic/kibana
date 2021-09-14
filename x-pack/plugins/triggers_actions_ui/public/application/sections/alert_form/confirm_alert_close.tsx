/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiConfirmModal } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

interface Props {
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmAlertClose: React.FC<Props> = ({ onConfirm, onCancel }) => {
  return (
    <EuiConfirmModal
      title={i18n.translate(
        'xpack.triggersActionsUI.sections.confirmAlertClose.confirmAlertCloseTitle',
        {
          defaultMessage: 'Discard unsaved changes to rule?',
        }
      )}
      onCancel={onCancel}
      onConfirm={onConfirm}
      confirmButtonText={i18n.translate(
        'xpack.triggersActionsUI.sections.confirmAlertClose.confirmAlertCloseConfirmButtonText',
        {
          defaultMessage: 'Discard changes',
        }
      )}
      cancelButtonText={i18n.translate(
        'xpack.triggersActionsUI.sections.confirmAlertClose.confirmAlertCloseCancelButtonText',
        {
          defaultMessage: 'Cancel',
        }
      )}
      defaultFocusedButton="confirm"
      data-test-subj="confirmAlertCloseModal"
    >
      <p>
        <FormattedMessage
          id="xpack.triggersActionsUI.sections.confirmAlertClose.confirmAlertCloseMessage"
          defaultMessage="You can't recover unsaved changes."
        />
      </p>
    </EuiConfirmModal>
  );
};
