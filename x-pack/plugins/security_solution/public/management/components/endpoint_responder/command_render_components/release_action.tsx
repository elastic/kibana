/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { memo, useMemo } from 'react';
import type { ActionRequestComponentProps } from '../types';
import { useSendReleaseEndpointRequest } from '../../../hooks/response_actions/use_send_release_endpoint_request';
import { useConsoleActionSubmitter } from '../hooks/use_console_action_submitter';

export const ReleaseActionResult = memo<ActionRequestComponentProps>(
  ({ command, setStore, store, status, setStatus, ResultComponent }) => {
    const releaseHostApi = useSendReleaseEndpointRequest();

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
      actionCreator: releaseHostApi,
      actionRequestBody,
      dataTestSubj: 'release',
    }).result;
  }
);
ReleaseActionResult.displayName = 'ReleaseActionResult';
