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
import { useSendKillProcessRequest } from '../../hooks/endpoint/use_send_kill_process_endpoint_request';
import { CommandExecutionComponentProps } from '../console/types';

export const KillProcessActionResult = memo<
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

  const killProcessApi = useSendKillProcessRequest();

  const { data: actionDetails } = useGetActionDetails(actionId ?? '-', {
    enabled: Boolean(actionId) && isPending,
    refetchInterval: isPending ? 3000 : false,
  });

  // Send Kill request if not yet done
  useEffect(() => {
    const pid = Number(command.args.args?.pid?.[0]);
    const entityId = command.args.args?.entityId?.[0];
    if (!actionRequestSent && endpointId) {
      if (pid !== undefined) {
        killProcessApi.mutate({
          endpoint_ids: [endpointId],
          comment: command.args.args?.comment?.[0],
          parameters: {
            pid,
          },
        });
      } else if (entityId !== undefined) {
        killProcessApi.mutate({
          endpoint_ids: [endpointId],
          comment: command.args.args?.comment?.[0],
          parameters: {
            entity_id: entityId,
          },
        });
      }

      setStore((prevState) => {
        return { ...prevState, actionRequestSent: true };
      });
    }
  }, [
    actionRequestSent,
    command.args.args?.comment,
    command.args.args?.pid,
    command.args.args?.entityId,
    endpointId,
    killProcessApi,
    setStore,
  ]);

  // If kill-process request was created, store the action id if necessary
  useEffect(() => {
    if (killProcessApi.isSuccess && actionId !== killProcessApi.data.action) {
      setStore((prevState) => {
        return { ...prevState, actionId: killProcessApi.data.action };
      });
    }
  }, [actionId, killProcessApi?.data?.action, killProcessApi.isSuccess, setStore]);

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
          id="xpack.securitySolution.endpointResponseActions.killProcess.pendingMessage"
          defaultMessage="Killing process"
        />
      </ResultComponent>
    );
  }

  // Show errors
  if (completedActionDetails?.errors) {
    return (
      <ResultComponent
        title={i18n.translate(
          'xpack.securitySolution.endpointResponseActions.killProcess.errorMessageTitle',
          { defaultMessage: 'Kill process action Failure' }
        )}
        data-test-subj="killProcessErrorCallout"
      >
        <FormattedMessage
          id="xpack.securitySolution.endpointResponseActions.killProcess.errorMessage"
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
        'xpack.securitySolution.endpointResponseActions.killProcess.successMessageTitle',
        { defaultMessage: 'Process killed successfully!' }
      )}
      data-test-subj="killProcessSuccessCallout"
    />
  );
});
KillProcessActionResult.displayName = 'KillProcessActionResult';
