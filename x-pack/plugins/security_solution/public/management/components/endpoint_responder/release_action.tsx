/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { ActionDetails } from '../../../../common/endpoint/types';
import { useGetActionDetails } from '../../hooks/endpoint/use_get_action_details';
import { EndpointCommandDefinitionMeta } from './types';
import { useSendReleaseEndpointRequest } from '../../hooks/endpoint/use_send_release_endpoint_request';
import { CommandExecutionComponentProps } from '../console/types';

export const ReleaseActionResult = memo<
  CommandExecutionComponentProps<
    { comment?: string },
    {
      actionId?: string;
      actionRequestSent?: boolean;
      completedActionDetails?: ActionDetails;
    },
    EndpointCommandDefinitionMeta
  >
>(({ command, setStore, store, status, setStatus, ResultComponent }) => {
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
        comment: command.args.args?.comment?.[0],
      });

      setStore((prevState) => {
        return { ...prevState, actionRequestSent: true };
      });
    }
  }, [actionRequestSent, command.args.args?.comment, endpointId, releaseHostApi, setStore]);

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
    return (
      <ResultComponent showAs="pending">
        <FormattedMessage
          id="xpack.securitySolution.endpointResponseActions.release.pendingMessage"
          defaultMessage="Releasing"
        />
      </ResultComponent>
    );
  }

  // Show errors
  if (completedActionDetails?.errors) {
    return (
      <ResultComponent
        title={i18n.translate(
          'xpack.securitySolution.endpointResponseActions.release.errorMessageTitle',
          { defaultMessage: 'Release action Failure' }
        )}
        data-test-subj="releaseErrorCallout"
      >
        <FormattedMessage
          id="xpack.securitySolution.endpointResponseActions.release.errorMessage"
          defaultMessage="The following errors were encountered: {errors}"
          values={{ errors: completedActionDetails.errors.join(' | ') }}
        />
      </ResultComponent>
    );
  }

  // Show Success
  return (
    <ResultComponent
      title={i18n.translate(
        'xpack.securitySolution.endpointResponseActions.release.successMessageTitle',
        { defaultMessage: 'Host isolated successfully!' }
      )}
      data-test-subj="releaseSuccessCallout"
    />
  );
});
ReleaseActionResult.displayName = 'ReleaseActionResult';
