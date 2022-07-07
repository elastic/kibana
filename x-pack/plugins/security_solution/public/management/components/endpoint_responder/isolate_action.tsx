/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { ActionDetails } from '../../../../common/endpoint/types';
import { useGetActionDetails } from '../../hooks/endpoint/use_get_action_details';
import { EndpointCommandDefinitionMeta } from './types';
import { useSendIsolateEndpointRequest } from '../../hooks/endpoint/use_send_isolate_endpoint_request';
import { CommandExecutionComponentProps } from '../console/types';
import { ActionError } from './action_error';

export const IsolateActionResult = memo<
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

  const isolateHostApi = useSendIsolateEndpointRequest();

  const { data: actionDetails } = useGetActionDetails(actionId ?? '-', {
    enabled: Boolean(actionId) && isPending,
    refetchInterval: isPending ? 3000 : false,
  });

  // Send Isolate request if not yet done
  useEffect(() => {
    if (!actionRequestSent && endpointId) {
      isolateHostApi.mutate({
        endpoint_ids: [endpointId],
        comment: command.args.args?.comment?.[0],
      });

      setStore((prevState) => {
        return { ...prevState, actionRequestSent: true };
      });
    }
  }, [actionRequestSent, command.args.args?.comment, endpointId, isolateHostApi, setStore]);

  // If isolate request was created, store the action id if necessary
  useEffect(() => {
    if (isolateHostApi.isSuccess && actionId !== isolateHostApi.data.action) {
      setStore((prevState) => {
        return { ...prevState, actionId: isolateHostApi.data.action };
      });
    }
  }, [actionId, isolateHostApi?.data?.action, isolateHostApi.isSuccess, setStore]);

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
          'xpack.securitySolution.endpointResponseActions.isolate.errorMessageTitle',
          { defaultMessage: 'Error. Isolate action failed.' }
        )}
        dataTestSubj={'isolateErrorCallout'}
        errors={completedActionDetails?.errors}
        ResultComponent={ResultComponent}
      />
    );
  }

  // Show Success
  return (
    <ResultComponent
      title={i18n.translate(
        'xpack.securitySolution.endpointResponseActions.isolate.successMessageTitle',
        { defaultMessage: 'Success. Host isolated.' }
      )}
      data-test-subj="isolateSuccessCallout"
    />
  );
});
IsolateActionResult.displayName = 'IsolateActionResult';
