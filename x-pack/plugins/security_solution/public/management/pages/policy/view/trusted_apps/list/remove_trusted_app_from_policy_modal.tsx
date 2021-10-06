/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect } from 'react';
import { EuiCallOut, EuiConfirmModal, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { useDispatch } from 'react-redux';
import { Dispatch } from 'redux';
import { Immutable, TrustedApp } from '../../../../../../../common/endpoint/types';
import { AppAction } from '../../../../../../common/store/actions';
import { usePolicyDetailsSelector } from '../../policy_hooks';
import {
  getTrustedAppsIsRemoving,
  getTrustedAppsRemovalError,
} from '../../../store/policy_details/selectors';
import { useToasts } from '../../../../../../common/lib/kibana';

export interface RemoveTrustedAppFromPolicyModalProps {
  trustedApps: Immutable<TrustedApp[]>;
  onClose: () => void;
}

export const RemoveTrustedAppFromPolicyModal = memo<RemoveTrustedAppFromPolicyModalProps>(
  ({ trustedApps, onClose }) => {
    const toasts = useToasts();
    const dispatch = useDispatch<Dispatch<AppAction>>();

    const isRemoving = usePolicyDetailsSelector(getTrustedAppsIsRemoving);
    const removeError = usePolicyDetailsSelector(getTrustedAppsRemovalError);

    const handleModalCancel = useCallback(() => {
      if (!isRemoving) {
        onClose();
      }
    }, [isRemoving, onClose]);

    const handleModalConfirm = useCallback(() => {
      dispatch({
        type: 'policyDetailsTrustedAppsRemoveIds',
        payload: { artifactIds: trustedApps.map((trustedApp) => trustedApp.id) },
      });
    }, [dispatch, trustedApps]);

    useEffect(() => {
      // When component is un-mounted, reset the state for remove in the store
      return () => dispatch({ type: 'policyDetailsArtifactsResetRemove' });
    }, [dispatch]);

    useEffect(() => {
      if (removeError) {
        toasts.addError(removeError, {
          title: i18n.translate(
            'xpack.securitySolution.endpoint.policy.trustedApps.list.removeDialog.errorToastTitle',
            {
              defaultMessage: 'Error while attempt to remove trusted application',
            }
          ),
        });
      }
    }, [removeError, toasts]);

    return (
      <EuiConfirmModal
        onCancel={handleModalCancel}
        onConfirm={handleModalConfirm}
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
        isLoading={isRemoving}
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
