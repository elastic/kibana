/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { memo, useMemo } from 'react';
import type { KillOrSuspendProcessRequestBody } from '../../../../../common/endpoint/types';
import { parsedPidOrEntityIdParameter } from '../lib/utils';
import { useSendKillProcessRequest } from '../../../hooks/response_actions/use_send_kill_process_endpoint_request';
import type { ActionRequestComponentProps } from '../types';
import { useConsoleActionSubmitter } from '../hooks/use_console_action_submitter';

export const KillProcessActionResult = memo<
  ActionRequestComponentProps<{ pid?: string[]; entityId?: string[]; processName?: string[] }>
>(({ command, setStore, store, status, setStatus, ResultComponent }) => {
  const actionCreator = useSendKillProcessRequest();

  const actionRequestBody = useMemo<undefined | KillOrSuspendProcessRequestBody>(() => {
    const endpointId = command.commandDefinition?.meta?.endpointId;
    let parameters = parsedPidOrEntityIdParameter(command.args.args);

    if (command.args.args.processName) {
      parameters = { process_name: command.args.args.processName[0] };
    }

    return endpointId
      ? {
          endpoint_ids: [endpointId],
          comment: command.args.args?.comment?.[0],
          parameters,
        }
      : undefined;
  }, [command.args.args, command.commandDefinition?.meta?.endpointId]);

  return useConsoleActionSubmitter<KillOrSuspendProcessRequestBody>({
    ResultComponent,
    setStore,
    store,
    status,
    setStatus,
    actionCreator,
    actionRequestBody,
    dataTestSubj: 'killProcess',
  }).result;
});
KillProcessActionResult.displayName = 'KillProcessActionResult';
