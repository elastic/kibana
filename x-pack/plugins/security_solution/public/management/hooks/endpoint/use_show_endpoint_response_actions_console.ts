/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { ActionLogButton } from '../../components/endpoint_console';
import { getEndpointResponseActionsConsoleCommands } from '../../components/endpoint_console/endpoint_response_actions_console_commands';
import { useConsoleManager } from '../../components/console';
import type { HostMetadata } from '../../../../common/endpoint/types';

type ShowEndpointResponseActionsConsole = (endpointMetadata: HostMetadata) => void;

export const useShowEndpointResponseActionsConsole = (): ShowEndpointResponseActionsConsole => {
  const consoleManager = useConsoleManager();

  return useCallback(
    (endpointMetadata: HostMetadata) => {
      const endpointAgentId = endpointMetadata.agent.id;
      const endpointRunningConsole = consoleManager.getOne(endpointAgentId);

      if (endpointRunningConsole) {
        endpointRunningConsole.show();
      } else {
        consoleManager
          .register({
            id: endpointAgentId,
            title: `${endpointMetadata.host.name} - Endpoint v${endpointMetadata.agent.version}`,
            consoleProps: {
              commands: getEndpointResponseActionsConsoleCommands(endpointAgentId),
              'data-test-subj': 'endpointResponseActionsConsole',
              prompt: `endpoint-${endpointMetadata.agent.version}`,
            },
            ActionComponents: [ActionLogButton],
          })
          .show();
      }
    },
    [consoleManager]
  );
};
