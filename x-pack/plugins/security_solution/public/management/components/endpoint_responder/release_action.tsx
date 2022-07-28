/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { ActionRequestComponentProps } from './types';
import { useSendReleaseEndpointRequest } from '../../hooks/endpoint/use_send_release_endpoint_request';
import { ActionError } from './action_error';
import { useUpdateActionState } from './hooks';

export const ReleaseActionResult = memo<ActionRequestComponentProps>(
  ({ command, setStore, store, status, setStatus, ResultComponent }) => {
    const endpointId = command.commandDefinition?.meta?.endpointId;
    const { completedActionDetails, actionRequest } = store;
    const isPending = status === 'pending';

    const releaseHostApi = useSendReleaseEndpointRequest();

    useUpdateActionState({
      actionRequestApi: releaseHostApi,
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
          dataTestSubj={'releaseErrorCallout'}
          action={completedActionDetails}
          ResultComponent={ResultComponent}
        />
      );
    }

    // Show Success
    return <ResultComponent data-test-subj="releaseSuccessCallout" />;
  }
);
ReleaseActionResult.displayName = 'ReleaseActionResult';
