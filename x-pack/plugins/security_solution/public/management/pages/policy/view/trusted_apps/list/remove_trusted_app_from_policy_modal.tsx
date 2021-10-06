/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { EuiCallOut, EuiConfirmModal, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { Immutable, TrustedApp } from '../../../../../../../common/endpoint/types';

export interface RemoveTrustedAppFromPolicyModalProps {
  trustedApps: Immutable<TrustedApp[]>;
  onClose: () => void;
}

export const RemoveTrustedAppFromPolicyModal = memo<RemoveTrustedAppFromPolicyModalProps>(
  ({ trustedApps, onClose }) => {
    const handleModalCancel = useCallback(() => {
      onClose();
    }, [onClose]);

    return (
      <EuiConfirmModal
        onCancel={handleModalCancel}
        title={i18n.translate(
          'xpack.securitySolution.endpoint.policy.trustedApps.list.removeDialog.title',
          { defaultMessage: 'Remove trusted application from policy' }
        )}
        cancelButtonText={i18n.translate(
          'xpack.securitySolution.endpoint.policy.trustedApps.list.removeDialog.cancelLabel',
          { defaultMessage: 'Cancel' }
        )}
        confirmButtonText={i18n.translate(
          'xpack.securitySolution.endpoint.policy.trustedApps.list.removeDialog.confirmLabel',
          {
            defaultMessage: 'Remove from policy',
          }
        )}
      >
        <EuiCallOut color="warning" iconType="help">
          <p>
            <FormattedMessage
              id="xpack.securitySolution.endpoint.policy.trustedApps.list.removeDialog.messageCallout"
              defaultMessage="This trusted application will be removed only from this policy and can still be found and managed from the trusted applications page."
            />
          </p>
        </EuiCallOut>

        <EuiSpacer />

        <EuiText size="s">
          <p>
            <FormattedMessage
              id="xpack.securitySolution.endpoint.policy.trustedApps.list.removeDialog.message"
              defaultMessage="Are you sure you wish to continue?"
            />
          </p>
        </EuiText>
      </EuiConfirmModal>
    );
  }
);
RemoveTrustedAppFromPolicyModal.displayName = 'RemoveTrustedAppFromPolicyModal';
