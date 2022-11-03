/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { memo, useMemo } from 'react';
import { useConsoleActionSubmitter } from '../hooks/use_console_action_submitter';
import type { ActionRequestComponentProps } from '../types';
import { useSendIsolateEndpointRequest } from '../../../hooks/response_actions/use_send_isolate_endpoint_request';

export const IsolateActionResult = memo<ActionRequestComponentProps>(
  ({ command, setStore, store, status, setStatus, ResultComponent }) => {
    const isolateHostApi = useSendIsolateEndpointRequest();

    const actionRequestBody = useMemo(() => {
      const endpointId = command.commandDefinition?.meta?.endpointId;
      const comment = command.args.args?.comment?.[0];

      return endpointId
        ? {
            endpoint_ids: [endpointId],
            comment,
          }
        : undefined;
    }, [command.args.args?.comment, command.commandDefinition?.meta?.endpointId]);

    return useConsoleActionSubmitter({
      ResultComponent,
      setStore,
      store,
      status,
      setStatus,
      actionCreator: isolateHostApi,
      actionRequestBody,
      dataTestSubj: 'isolate',
    }).result;
  }
);
IsolateActionResult.displayName = 'IsolateActionResult';
