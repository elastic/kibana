/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { ActionRequestComponentProps } from './types';
import { useSendIsolateEndpointRequest } from '../../hooks/endpoint/use_send_isolate_endpoint_request';
import { ActionError } from './action_error';
import { useUpdateActionState } from './hooks';

export const IsolateActionResult = memo<ActionRequestComponentProps>(
  ({ command, setStore, store, status, setStatus, ResultComponent }) => {
    const endpointId = command.commandDefinition?.meta?.endpointId;
    const { completedActionDetails, actionRequest } = store;
    const isPending = status === 'pending';
    const isolateHostApi = useSendIsolateEndpointRequest();

    useUpdateActionState({
      actionRequestApi: isolateHostApi,
      actionRequest,
      command,
      endpointId,
      setStatus,
      setStore,
      isPending,
    });

    // Show nothing if still pending
    if (isPending) {
      return <ResultComponent showAs="pending" />;
    }

    // Show errors
    if (completedActionDetails?.errors) {
      return (
        <ActionError
          dataTestSubj={'isolateErrorCallout'}
          action={completedActionDetails}
          ResultComponent={ResultComponent}
        />
      );
    }

    // Show Success
    return <ResultComponent showAs="success" data-test-subj="isolateSuccessCallout" />;
  }
);
IsolateActionResult.displayName = 'IsolateActionResult';
