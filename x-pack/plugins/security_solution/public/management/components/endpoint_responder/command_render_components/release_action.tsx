/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { memo, useMemo } from 'react';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import type { ActionRequestComponentProps } from '../types';
import { useSendReleaseEndpointRequest } from '../../../hooks/response_actions/use_send_release_endpoint_request';
import { useConsoleActionSubmitter } from '../hooks/use_console_action_submitter';

export const ReleaseActionResult = memo<ActionRequestComponentProps>(
  ({ command, setStore, store, status, setStatus, ResultComponent }) => {
    const isSentinelOneV1Enabled = useIsExperimentalFeatureEnabled(
      'responseActionsSentinelOneV1Enabled'
    );
    const releaseHostApi = useSendReleaseEndpointRequest();

    const actionRequestBody = useMemo(() => {
      const endpointId = command.commandDefinition?.meta?.endpointId;
      const comment = command.args.args?.comment?.[0];
      const agentType = command.commandDefinition?.meta?.agentType;

      return endpointId
        ? {
            agent_type: isSentinelOneV1Enabled ? agentType : undefined,
            endpoint_ids: [endpointId],
            comment,
          }
        : undefined;
    }, [
      command.args.args?.comment,
      command.commandDefinition?.meta?.agentType,
      command.commandDefinition?.meta?.endpointId,
      isSentinelOneV1Enabled,
    ]);

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
