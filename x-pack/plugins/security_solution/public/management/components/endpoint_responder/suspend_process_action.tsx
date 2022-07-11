/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ActionDetails } from '../../../../common/endpoint/types';
import { useGetActionDetails } from '../../hooks/endpoint/use_get_action_details';
import type { EndpointCommandDefinitionMeta } from './types';
import { useSendSuspendProcessRequest } from '../../hooks/endpoint/use_send_suspend_process_endpoint_request';
import type { CommandExecutionComponentProps } from '../console/types';
import { parsedPidOrEntityIdParameter } from '../console/service/parsed_command_input';
import { ActionError } from './action_error';

export const SuspendProcessActionResult = memo<
  CommandExecutionComponentProps<
    { comment?: string; pid?: number; entityId?: string },
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

  const { mutate, data, isSuccess, error } = useSendSuspendProcessRequest();

  const { data: actionDetails } = useGetActionDetails(actionId ?? '-', {
    enabled: Boolean(actionId) && isPending,
    refetchInterval: isPending ? 3000 : false,
  });

  // Send Suspend request if not yet done
  useEffect(() => {
    const parameters = parsedPidOrEntityIdParameter(command.args.args);

    if (!actionRequestSent && endpointId && parameters) {
      mutate({
        endpoint_ids: [endpointId],
        comment: command.args.args?.comment?.[0],
        parameters,
      });
      setStore((prevState) => {
        return { ...prevState, actionRequestSent: true };
      });
    }
  }, [actionRequestSent, command.args.args, endpointId, mutate, setStore]);

  // If suspend-process request was created, store the action id if necessary
  useEffect(() => {
    if (isSuccess && actionId !== data.data.id) {
      setStore((prevState) => {
        return { ...prevState, actionId: data.data.id };
      });
    }
  }, [actionId, data?.data.id, isSuccess, error, setStore]);

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
          id="xpack.securitySolution.endpointResponseActions.suspendProcess.pendingMessage"
          defaultMessage="Suspending process"
        />
      </ResultComponent>
    );
  }

  // Show errors
  if (completedActionDetails?.errors) {
    return (
      <ActionError
        title={i18n.translate(
          'xpack.securitySolution.endpointResponseActions.suspendProcess.errorMessageTitle',
          { defaultMessage: 'Suspend process action failure' }
        )}
        dataTestSubj={'suspendProcessErrorCallout'}
        errors={completedActionDetails?.errors}
        ResultComponent={ResultComponent}
      />
    );
  }

  // Show Success
  return (
    <ResultComponent
      title={i18n.translate(
        'xpack.securitySolution.endpointResponseActions.suspendProcess.successMessageTitle',
        { defaultMessage: 'Process suspended successfully' }
      )}
      data-test-subj="suspendProcessSuccessCallout"
    />
  );
});
SuspendProcessActionResult.displayName = 'SuspendProcessActionResult';
