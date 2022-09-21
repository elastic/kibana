/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { memo, useMemo } from 'react';
import { useConsoleActionSubmitter } from './hooks/use_console_action_submitter';
import type { ActionRequestComponentProps } from './types';
import { useSendIsolateEndpointRequest } from '../../hooks/endpoint/use_send_isolate_endpoint_request';

export const IsolateActionResult = memo<ActionRequestComponentProps>(
  ({ command, setStore, store, status, setStatus, ResultComponent }) => {
    const isolateHostApi = useSendIsolateEndpointRequest();

    const endpointId = command.commandDefinition?.meta?.endpointId;
    const comment = command.args.args?.comment?.[0];

    const actionRequestBody = useMemo(() => {
      return endpointId
        ? {
            endpoint_ids: [endpointId],
            comment,
          }
        : undefined;
    }, [comment, endpointId]);

    return useConsoleActionSubmitter({
      ResultComponent,
      setStore,
      store,
      status,
      setStatus,
      actionCreator: isolateHostApi,
      actionRequestBody,
    }).result;
  }
);
IsolateActionResult.displayName = 'IsolateActionResult';
