/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer, EuiConfirmModal, EuiCallOut } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

export const ConfirmUpdate = React.memo<{
  hostCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}>(({ hostCount, onCancel, onConfirm }) => {
  return (
    <EuiConfirmModal
      data-test-subj="policyDetailsConfirmModal"
      title={i18n.translate('xpack.securitySolution.endpoint.policy.details.updateConfirm.title', {
        defaultMessage: 'Save and deploy changes',
      })}
      onCancel={onCancel}
      onConfirm={onConfirm}
      confirmButtonText={i18n.translate(
        'xpack.securitySolution.endpoint.policy.details.updateConfirm.confirmButtonTitle',
        {
          defaultMessage: 'Save and deploy changes',
        }
      )}
      cancelButtonText={i18n.translate(
        'xpack.securitySolution.endpoint.policy.details.updateConfirm.cancelButtonTitle',
        {
          defaultMessage: 'Cancel',
        }
      )}
    >
      {hostCount > 0 && (
        <>
          <EuiCallOut
            data-test-subj="policyDetailsWarningCallout"
            title={i18n.translate(
              'xpack.securitySolution.endpoint.policy.details.updateConfirm.warningTitle',
              {
                defaultMessage:
                  'This action will update {hostCount, plural, one {# host} other {# hosts}}',
                values: { hostCount },
              }
            )}
          >
            <FormattedMessage
              id="xpack.securitySolution.endpoint.policy.details.updateConfirm.warningMessage"
              defaultMessage="Saving these changes will apply updates to all endpoints assigned to this agent policy."
            />
          </EuiCallOut>
          <EuiSpacer size="xl" />
        </>
      )}
      <p>
        <FormattedMessage
          id="xpack.securitySolution.endpoint.policy.details.updateConfirm.message"
          defaultMessage="This action cannot be undone. Are you sure you wish to continue?"
        />
      </p>
    </EuiConfirmModal>
  );
});

ConfirmUpdate.displayName = 'ConfirmUpdate';
