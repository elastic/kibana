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
import { useSendKillProcessRequest } from '../../hooks/endpoint/use_send_kill_process_endpoint_request';
import type { CommandExecutionComponentProps } from '../console/types';
import { parsedPidOrEntityIdParameter } from '../console/service/parsed_command_input';
import { EuiSpacer } from '@elastic/eui';

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
    const parameters = parsedPidOrEntityIdParameter(command.args.args);

    if (!actionRequestSent && endpointId && parameters) {
      killProcessApi.mutate({
        endpoint_ids: [endpointId],
        comment: command.args.args?.comment?.[0],
        parameters,
      });
      setStore((prevState) => {
        return { ...prevState, actionRequestSent: true };
      });
    }
  }, [actionRequestSent, command.args.args, endpointId, killProcessApi, setStore]);

  // If kill-process request was created, store the action id if necessary
  useEffect(() => {
    if (killProcessApi.isSuccess && actionId !== killProcessApi.data.data.id) {
      setStore((prevState) => {
        return { ...prevState, actionId: killProcessApi.data.data.id };
      });
    }
  }, [
    actionId,
    killProcessApi?.data?.data.id,
    killProcessApi.isSuccess,
    killProcessApi.error,
    setStore,
  ]);

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
        showAs="failure"
        title={i18n.translate(
          'xpack.securitySolution.endpointResponseActions.killProcess.errorMessageTitle',
          { defaultMessage: 'Kill process action failure' }
        )}
        data-test-subj="killProcessErrorCallout"
      >
        <div>
        <FormattedMessage
          id="xpack.securitySolution.endpointResponseActions.getProcesses.errorMessage"
          defaultMessage="The following errors were encountered:"
          values={{ errors: completedActionDetails.errors.join(' | ') }}
        />
        </div>
        <EuiSpacer size="s"></EuiSpacer>
        <div>
        <FormattedMessage
          id="xpack.securitySolution.endpointResponseActions.getProcesses.errorList"
          defaultMessage="{errors}"
          values={{ errors: completedActionDetails.errors.join(' | ') }}
        />
        </div>
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
