/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { EndpointConsoleCommandService } from '../../components/endpoint_console/endpoint_console_command_service';
import { useConsoleManager } from '../../components/console';
import { HostMetadata } from '../../../../common/endpoint/types';

type ShowEndpointResponseActionsConsole = (endpointMetadata: HostMetadata) => void;

export const useShowEndpointResponseActionsConsole = (): ShowEndpointResponseActionsConsole => {
  const consoleManager = useConsoleManager();

  return useCallback(
    (endpointMetadata: HostMetadata) => {
      const endpointRunningConsole = consoleManager.getOne(endpointMetadata.agent.id);

      if (endpointRunningConsole) {
        endpointRunningConsole.show();
      } else {
        consoleManager
          .register({
            id: endpointMetadata.agent.id,
            title: `${endpointMetadata.host.name} - Endpoint v${endpointMetadata.agent.version}`,
            consoleProps: {
              'data-test-subj': 'endpointResponseActionsConsole',
              prompt: `endpoint-${endpointMetadata.agent.version}`,
              commandService: new EndpointConsoleCommandService(endpointMetadata),
            },
          })
          .show();
      }
    },
    [consoleManager]
  );
};
