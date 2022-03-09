/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiConfirmModal, EuiSpacer, EuiText } from '@elastic/eui';
import { useQueryClient } from 'react-query';
import { HttpFetchError } from 'kibana/public';
import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import React, { useCallback } from 'react';
import { useBulkUpdateArtifact } from '../../../../../hooks/artifacts';
import { useToasts } from '../../../../../../common/lib/kibana';
import { ExceptionsListApiClient } from '../../../../../services/exceptions_list/exceptions_list_api_client';
import { BY_POLICY_ARTIFACT_TAG_PREFIX } from '../../../../../../../common/endpoint/service/artifacts';
import { POLICY_ARTIFACT_DELETE_MODAL_LABELS } from './translations';

interface PolicyArtifactsDeleteModalProps {
  policyId: string;
  policyName: string;
  apiClient: ExceptionsListApiClient;
  exception: ExceptionListItemSchema;
  onClose: () => void;
  labels: typeof POLICY_ARTIFACT_DELETE_MODAL_LABELS;
}

export const PolicyArtifactsDeleteModal = React.memo<PolicyArtifactsDeleteModalProps>(
  ({ policyId, policyName, apiClient, exception, onClose, labels }) => {
    const toasts = useToasts();
    const queryClient = useQueryClient();

    const { mutate: updateArtifact, isLoading: isUpdateArtifactLoading } = useBulkUpdateArtifact(
      apiClient,
      {
        onSuccess: () => {
          toasts.addSuccess({
            title: labels.deleteModalSuccessMessageTitle,
            text: labels.deleteModalSuccessMessageText(exception, policyName),
          });
          queryClient.invalidateQueries(['list', apiClient]);
          onClose();
        },
        onError: (error?: HttpFetchError) => {
          toasts.addError(error as unknown as Error, {
            title: labels.deleteModalErrorMessage,
          });
        },
      }
    );

    const handleModalConfirm = useCallback(() => {
      const modifiedException = {
        ...exception,
        tags: exception.tags.filter((tag) => tag !== `${BY_POLICY_ARTIFACT_TAG_PREFIX}${policyId}`),
      };
      updateArtifact([modifiedException]);
    }, [exception, policyId, updateArtifact]);

    const handleOnClose = useCallback(() => {
      if (!isUpdateArtifactLoading) {
        onClose();
      }
    }, [isUpdateArtifactLoading, onClose]);

    return (
      <EuiConfirmModal
        onCancel={handleOnClose}
        onConfirm={handleModalConfirm}
        title={labels.deleteModalTitle}
        cancelButtonText={labels.deleteModalCancelButtonTitle}
        confirmButtonText={labels.deleteModalSubmitButtonTitle}
        isLoading={isUpdateArtifactLoading}
        data-test-subj={'remove-from-policy-dialog'}
      >
        <EuiCallOut color="warning" iconType="help">
          <p>{labels.deleteModalImpactInfo}</p>
        </EuiCallOut>

        <EuiSpacer />

        <EuiText size="s">
          <p>{labels.deleteModalConfirmInfo}</p>
        </EuiText>
      </EuiConfirmModal>
    );
  }
);
