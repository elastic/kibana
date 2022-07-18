/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import type { ActionDetails } from '../../../../common/endpoint/types';
import { useGetActionDetails } from '../../hooks/endpoint/use_get_action_details';
import type { EndpointCommandDefinitionMeta } from './types';
import { useSendReleaseEndpointRequest } from '../../hooks/endpoint/use_send_release_endpoint_request';
import type { CommandExecutionComponentProps } from '../console/types';
import { ActionError } from './action_error';

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
    return <ResultComponent showAs="pending" />;
  }

  // Show errors
  if (completedActionDetails?.errors) {
    return (
      <ActionError
        title={i18n.translate(
          'xpack.securitySolution.endpointResponseActions.release.errorMessageTitle',
          { defaultMessage: 'Error. Release action failed.' }
        )}
        dataTestSubj={'releaseErrorCallout'}
        errors={completedActionDetails?.errors}
        ResultComponent={ResultComponent}
      />
    );
  }

  // Show Success
  return (
    <ResultComponent
      title={i18n.translate(
        'xpack.securitySolution.endpointResponseActions.release.successMessageTitle',
        { defaultMessage: 'Success. Host released.' }
      )}
      data-test-subj="releaseSuccessCallout"
    />
  );
});
ReleaseActionResult.displayName = 'ReleaseActionResult';
