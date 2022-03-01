/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiConfirmModal, EuiSpacer, EuiText } from '@elastic/eui';
import { useQueryClient } from 'react-query';
import { i18n } from '@kbn/i18n';
import { HttpFetchError } from 'kibana/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import React, { useCallback } from 'react';
import { useBulkUpdateArtifact } from '../../../../../hooks/artifacts';
import { useToasts } from '../../../../../../common/lib/kibana';
import { ExceptionsListApiClient } from '../../../../../services/exceptions_list/exceptions_list_api_client';

interface PolicyArtifactsDeleteModalProps {
  policyId: string;
  policyName: string;
  apiClient: ExceptionsListApiClient;
  exception: ExceptionListItemSchema;
  onCancel: () => void;
}

export const PolicyArtifactsDeleteModal = React.memo<PolicyArtifactsDeleteModalProps>(
  ({ policyId, policyName, apiClient, exception, onCancel }) => {
    const toasts = useToasts();
    const queryClient = useQueryClient();

    const { mutate: updateArtifact, isLoading: isUpdateArtifactLoading } = useBulkUpdateArtifact(
      apiClient,
      {
        onSuccess: () => {
          toasts.addSuccess({
            title: i18n.translate(
              'xpack.securitySolution.endpoint.policy.artifacts.list.removeDialog.successToastTitle',
              { defaultMessage: 'Successfully removed' }
            ),
            text: i18n.translate(
              'xpack.securitySolution.endpoint.policy.artifacts.list.removeDialog.successToastText',
              {
                defaultMessage: '"{artifactName}" has been removed from {policyName} policy',
                values: { artifactName: exception.name, policyName },
              }
            ),
          });
        },
        onError: (error?: HttpFetchError) => {
          toasts.addError(error as unknown as Error, {
            title: i18n.translate(
              'xpack.securitySolution.endpoint.policy.artifacts.list.removeDialog.errorToastTitle',
              {
                defaultMessage: 'Error while attempt to remove [artifact]',
              }
            ),
          });
        },
        onSettled: () => {
          queryClient.invalidateQueries(['list', apiClient]);
          onCancel();
        },
      }
    );

    const handleModalConfirm = useCallback(() => {
      const modifiedException = {
        ...exception,
        tags: exception.tags.filter((tag) => tag !== `policy:${policyId}`),
      };
      updateArtifact([modifiedException]);
    }, [exception, policyId, updateArtifact]);

    const handleCancel = useCallback(() => {
      if (!isUpdateArtifactLoading) {
        onCancel();
      }
    }, [isUpdateArtifactLoading, onCancel]);

    return (
      <EuiConfirmModal
        onCancel={handleCancel}
        onConfirm={handleModalConfirm}
        title={i18n.translate(
          'xpack.securitySolution.endpoint.policy.artifacts.list.removeDialog.title',
          { defaultMessage: 'Remove [artifact] from policy' }
        )}
        cancelButtonText={i18n.translate(
          'xpack.securitySolution.endpoint.policy.artifacts.list.removeDialog.cancelLabel',
          { defaultMessage: 'Cancel' }
        )}
        confirmButtonText={i18n.translate(
          'xpack.securitySolution.endpoint.policy.artifacts.list.removeDialog.confirmLabel',
          {
            defaultMessage: 'Remove from policy',
          }
        )}
        isLoading={isUpdateArtifactLoading}
        data-test-subj={'remove-from-policy-dialog'}
      >
        <EuiCallOut color="warning" iconType="help">
          <p>
            <FormattedMessage
              id="xpack.securitySolution.endpoint.policy.artifacts.list.removeDialog.messageCallout"
              defaultMessage="This [artifact] will be removed only from this policy and can still be found and managed from the [artifact] page."
            />
          </p>
        </EuiCallOut>

        <EuiSpacer />

        <EuiText size="s">
          <p>
            <FormattedMessage
              id="xpack.securitySolution.endpoint.policy.artifacts.list.removeDialog.message"
              defaultMessage="Are you sure you wish to continue?"
            />
          </p>
        </EuiText>
      </EuiConfirmModal>
    );
  }
);
