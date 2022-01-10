/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiConfirmModal, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import React from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { useHttp, useToasts } from '../../../../../../common/lib/kibana';
import { ServerApiError } from '../../../../../../common/types';
import { updateOneHostIsolationExceptionItem } from '../../../../host_isolation_exceptions/service';

export const PolicyHostIsolationExceptionsDeleteModal = ({
  policyId,
  exception,
  onCancel,
}: {
  policyId: string;
  exception: ExceptionListItemSchema;
  onCancel: () => void;
}) => {
  const toasts = useToasts();
  const http = useHttp();
  const queryClient = useQueryClient();

  const onDeleteError = (error: ServerApiError) => {
    toasts.addError(error as unknown as Error, {
      title: i18n.translate(
        'xpack.securitySolution.endpoint.policy.hostIsolationExceptions.list.removeDialog.errorToastTitle',
        {
          defaultMessage: 'Error while attempt to remove host isolation exception',
        }
      ),
    });
    onCancel();
  };

  const onDeleteSuccess = () => {
    queryClient.invalidateQueries(['endpointSpecificPolicies']);
    queryClient.invalidateQueries(['hostIsolationExceptions']);
    toasts.addSuccess({
      title: i18n.translate(
        'xpack.securitySolution.endpoint.policy.hostIsolationExceptions.list.removeDialog.successToastTitle',
        { defaultMessage: 'Successfully removed' }
      ),
      text: i18n.translate(
        'xpack.securitySolution.endpoint.policy.hostIsolationExceptions.list.removeDialog.successToastText',
        {
          defaultMessage: '"{exception}" has been removed from policy',
          values: { exception: exception.name },
        }
      ),
    });
    onCancel();
  };

  const mutation = useMutation(
    async () => {
      const modifiedException = {
        ...exception,
        tags: exception.tags.filter((tag) => tag !== `policy:${policyId}`),
      };
      return updateOneHostIsolationExceptionItem(http, modifiedException);
    },
    {
      onSuccess: onDeleteSuccess,
      onError: onDeleteError,
    }
  );

  const handleModalConfirm = () => {
    mutation.mutate();
  };

  const handleCancel = () => {
    if (!mutation.isLoading) {
      onCancel();
    }
  };

  return (
    <EuiConfirmModal
      onCancel={handleCancel}
      onConfirm={handleModalConfirm}
      title={i18n.translate(
        'xpack.securitySolution.endpoint.policy.hostIsolationExceptions.list.removeDialog.title',
        { defaultMessage: 'Remove host isolation exception from policy' }
      )}
      cancelButtonText={i18n.translate(
        'xpack.securitySolution.endpoint.policy.hostIsolationExceptions.list.removeDialog.cancelLabel',
        { defaultMessage: 'Cancel' }
      )}
      confirmButtonText={i18n.translate(
        'xpack.securitySolution.endpoint.policy.hostIsolationExceptions.list.removeDialog.confirmLabel',
        {
          defaultMessage: 'Remove from policy',
        }
      )}
      isLoading={mutation.isLoading}
      data-test-subj={'remove-from-policy-dialog'}
    >
      <EuiCallOut color="warning" iconType="help">
        <p>
          <FormattedMessage
            id="xpack.securitySolution.endpoint.policy.hostIsolationExceptions.list.removeDialog.messageCallout"
            defaultMessage="This host isolation exception will be removed only from this policy and can still be found and managed from the host isolation exceptions page."
          />
        </p>
      </EuiCallOut>

      <EuiSpacer />

      <EuiText size="s">
        <p>
          <FormattedMessage
            id="xpack.securitySolution.endpoint.policy.hostIsolationExceptions.list.removeDialog.message"
            defaultMessage="Are you sure you wish to continue?"
          />
        </p>
      </EuiText>
    </EuiConfirmModal>
  );
};
