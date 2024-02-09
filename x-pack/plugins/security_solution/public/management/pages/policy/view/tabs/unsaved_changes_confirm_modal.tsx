/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiConfirmModal } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

export const UnsavedChangesConfirmModal = React.memo<{
  onConfirm: () => void;
  onCancel: () => void;
}>(({ onCancel, onConfirm }) => {
  return (
    <EuiConfirmModal
      data-test-subj="policyDetailsUnsavedChangesModal"
      title={i18n.translate('xpack.securitySolution.endpoint.policy.details.unsavedChanges.title', {
        defaultMessage: 'Unsaved changes',
      })}
      onCancel={onCancel}
      onConfirm={onConfirm}
      confirmButtonText={i18n.translate(
        'xpack.securitySolution.endpoint.policy.details.unsavedChanges.confirmButtonTitle',
        {
          defaultMessage: 'Continue',
        }
      )}
      cancelButtonText={i18n.translate(
        'xpack.securitySolution.endpoint.policy.details.unsavedChanges.cancelButtonTitle',
        {
          defaultMessage: 'Cancel',
        }
      )}
    >
      <FormattedMessage
        id="xpack.securitySolution.endpoint.policy.details.unsavedChanges.warningMessage"
        defaultMessage="You have unsaved changes. Click Continue to discard your changes or Cancel to continue editing. Your changes won't be saved until you click Save button."
      />
    </EuiConfirmModal>
  );
});

UnsavedChangesConfirmModal.displayName = 'UnsavedChangesConfirmModal';
