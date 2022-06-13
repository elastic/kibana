/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCallOut } from '@elastic/eui';
import { ActionDetails } from '../../../../common/endpoint/types';
import { useGetActionDetails } from '../../hooks/endpoint/use_get_action_details';
import { EndpointCommandDefinitionMeta } from './types';
import { useSendReleaseEndpointRequest } from '../../hooks/endpoint/use_send_release_endpoint_request';
import { CommandExecutionComponentProps } from '../console/types';

export const ReleaseActionResult = memo<
  CommandExecutionComponentProps<
    {
      actionId?: string;
      actionRequestSent?: boolean;
      completedActionDetails?: ActionDetails;
    },
    EndpointCommandDefinitionMeta
  >
>(({ command, setStore, store, status, setStatus }) => {
  const endpointId = command.commandDefinition?.meta?.endpointId;
  const { actionId, completedActionDetails } = store;
  const isPending = status === 'pending';
  const actionRequestSent = Boolean(store.actionRequestSent);

  const releaseHostApi = useSendReleaseEndpointRequest();

  const { data: actionDetails } = useGetActionDetails(actionId ?? '-', {
    enabled: Boolean(actionId) && isPending,
    refetchInterval: isPending ? 3000 : false,
  });

  // Send Release request if not yet done
  useEffect(() => {
    if (!actionRequestSent && endpointId) {
      releaseHostApi.mutate({
        endpoint_ids: [endpointId],
        comment: command.args.args?.comment?.value,
      });

      setStore((prevState) => {
        return { ...prevState, actionRequestSent: true };
      });
    }
  }, [actionRequestSent, command.args.args?.comment?.value, endpointId, releaseHostApi, setStore]);

  // If release request was created, store the action id if necessary
  useEffect(() => {
    if (releaseHostApi.isSuccess && actionId !== releaseHostApi.data.action) {
      setStore((prevState) => {
        return { ...prevState, actionId: releaseHostApi.data.action };
      });
    }
  }, [actionId, releaseHostApi?.data?.action, releaseHostApi.isSuccess, setStore]);

  useEffect(() => {
    if (actionDetails?.data.isCompleted) {
      setStatus('success');
      setStore((prevState) => {
        return {
          ...prevState,
          completedActionDetails: actionDetails.data,
        };
      });
    }
  }, [actionDetails?.data, setStatus, setStore]);

  // Show nothing if still pending
  if (isPending) {
    return null;
  }

  // Show errors
  if (completedActionDetails?.errors) {
    return (
      <EuiCallOut
        color="danger"
        iconType="alert"
        title={i18n.translate(
          'xpack.securitySolution.endpointResponseActions.release.errorMessageTitle',
          { defaultMessage: 'Failure' }
        )}
        data-test-subj="releaseErrorCallout"
      >
        <FormattedMessage
          id="xpack.securitySolution.endpointResponseActions.release.errorMessage"
          defaultMessage="Release action failed with: {errors}"
          values={{ errors: completedActionDetails.errors.join(' | ') }}
        />
      </EuiCallOut>
    );
  }

  // Show Success
  return (
    <EuiCallOut
      color="success"
      iconType="check"
      title={i18n.translate(
        'xpack.securitySolution.endpointResponseActions.release.successMessageTitle',
        { defaultMessage: 'Success' }
      )}
      data-test-subj="releaseSuccessCallout"
    >
      <FormattedMessage
        id="xpack.securitySolution.endpointResponseActions.release.successMessage"
        defaultMessage="A host isolation request was sent and an acknowledgement was received from Host."
      />
    </EuiCallOut>
  );
});
ReleaseActionResult.displayName = 'ReleaseActionResult';
