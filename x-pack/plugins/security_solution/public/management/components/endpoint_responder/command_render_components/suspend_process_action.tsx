/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { memo, useMemo } from 'react';
import { parsedPidOrEntityIdParameter } from '../lib/utils';
import type {
  SuspendProcessActionOutputContent,
  KillOrSuspendProcessRequestBody,
} from '../../../../../common/endpoint/types';
import { useSendSuspendProcessRequest } from '../../../hooks/response_actions/use_send_suspend_process_endpoint_request';
import type { ActionRequestComponentProps } from '../types';
import { useConsoleActionSubmitter } from '../hooks/use_console_action_submitter';

export const SuspendProcessActionResult = memo<
  ActionRequestComponentProps<{ pid?: string[]; entityId?: string[] }>
>(({ command, setStore, store, status, setStatus, ResultComponent }) => {
  const actionCreator = useSendSuspendProcessRequest();

  const actionRequestBody = useMemo<undefined | KillOrSuspendProcessRequestBody>(() => {
    const endpointId = command.commandDefinition?.meta?.endpointId;
    const parameters = parsedPidOrEntityIdParameter(command.args.args);

    return endpointId
      ? {
          endpoint_ids: [endpointId],
          comment: command.args.args?.comment?.[0],
          parameters,
        }
      : undefined;
  }, [command.args.args, command.commandDefinition?.meta?.endpointId]);

  return useConsoleActionSubmitter<
    KillOrSuspendProcessRequestBody,
    SuspendProcessActionOutputContent
  >({
    ResultComponent,
    setStore,
    store,
    status,
    setStatus,
    actionCreator,
    actionRequestBody,
    dataTestSubj: 'suspendProcess',
  }).result;
});
SuspendProcessActionResult.displayName = 'SuspendProcessActionResult';
