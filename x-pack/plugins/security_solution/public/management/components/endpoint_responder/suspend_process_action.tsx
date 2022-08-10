/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { parsedPidOrEntityIdParameter } from './utils';
import { ActionSuccess } from './action_success';
import type {
  ActionDetails,
  SuspendProcessActionOutputContent,
} from '../../../../common/endpoint/types';
import { useGetActionDetails } from '../../hooks/endpoint/use_get_action_details';
import type { EndpointCommandDefinitionMeta } from './types';
import { useSendSuspendProcessRequest } from '../../hooks/endpoint/use_send_suspend_process_endpoint_request';
import type { CommandExecutionComponentProps } from '../console/types';
import { ActionError } from './action_error';
import { ACTION_DETAILS_REFRESH_INTERVAL } from './constants';

export const SuspendProcessActionResult = memo<
  CommandExecutionComponentProps<
    { comment?: string; pid?: number; entityId?: string },
    {
      actionId?: string;
      actionRequestSent?: boolean;
      completedActionDetails?: ActionDetails<SuspendProcessActionOutputContent>;
      apiError?: IHttpFetchError;
    },
    EndpointCommandDefinitionMeta
  >
>(({ command, setStore, store, status, setStatus, ResultComponent }) => {
  const endpointId = command.commandDefinition?.meta?.endpointId;
  const { actionId, completedActionDetails, apiError } = store;
  const isPending = status === 'pending';
  const isError = status === 'error';
  const actionRequestSent = Boolean(store.actionRequestSent);

  const { mutate, data, isSuccess, error } = useSendSuspendProcessRequest();

  const { data: actionDetails } = useGetActionDetails<SuspendProcessActionOutputContent>(
    actionId ?? '-',
    {
      enabled: Boolean(actionId) && isPending,
      refetchInterval: isPending ? ACTION_DETAILS_REFRESH_INTERVAL : false,
    }
  );

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
    if (isPending) {
      if (isSuccess && actionId !== data.data.id) {
        setStore((prevState) => {
          return { ...prevState, actionId: data.data.id };
        });
      } else if (error) {
        setStatus('error');
        setStore((prevState) => {
          return { ...prevState, apiError: error };
        });
      }
    }
  }, [actionId, data?.data.id, isSuccess, error, setStore, setStatus, isPending]);

  useEffect(() => {
    if (actionDetails?.data.isCompleted && isPending) {
      setStatus('success');
      setStore((prevState) => {
        return {
          ...prevState,
          completedActionDetails: actionDetails.data,
        };
      });
    }
  }, [actionDetails?.data, setStatus, setStore, isPending]);

  // Show API errors if perform action fails
  if (isError && apiError) {
    return (
      <ResultComponent showAs="failure" data-test-subj="suspendProcessAPIErrorCallout">
        <FormattedMessage
          id="xpack.securitySolution.endpointResponseActions.suspendProcess.performApiErrorMessage"
          defaultMessage="The following error was encountered: {error}"
          values={{ error: apiError.message }}
        />
      </ResultComponent>
    );
  }

  // Show nothing if still pending
  if (isPending || !completedActionDetails) {
    return <ResultComponent showAs="pending" />;
  }

  // Show errors
  if (completedActionDetails?.errors) {
    return (
      <ActionError
        dataTestSubj={'suspendProcessErrorCallout'}
        action={completedActionDetails}
        ResultComponent={ResultComponent}
      />
    );
  }

  // Show Success
  return (
    <ActionSuccess
      action={completedActionDetails}
      ResultComponent={ResultComponent}
      data-test-subj="suspendProcessSuccessCallout"
    />
  );
});
SuspendProcessActionResult.displayName = 'SuspendProcessActionResult';
