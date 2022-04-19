/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { EndpointConsoleCommandService } from '../../components/endpoint_console/endpoint_console_command_service';
import { useConsoleManager } from '../../components/console';
import { HostInfo } from '../../../../common/endpoint/types';

export const useShowEndpointResponseActionsConsole = (): ((endpointHostInfo: HostInfo) => void) => {
  const consoleManager = useConsoleManager();

  return useCallback(
    (endpointHostInfo: HostInfo) => {
      const endpointRunningConsole = consoleManager.getOne(endpointHostInfo.metadata.agent.id);

      if (endpointRunningConsole) {
        endpointRunningConsole.show();
      } else {
        consoleManager
          .register({
            id: endpointHostInfo.metadata.agent.id,
            title: `${endpointHostInfo.metadata.host.name} - Endpoint v${endpointHostInfo.metadata.agent.version}`,
            consoleProps: {
              'data-test-subj': 'endpointResponseActionsConsole',
              prompt: `endpoint-${endpointHostInfo.metadata.agent.version}`,
              commandService: new EndpointConsoleCommandService(endpointHostInfo),
            },
          })
          .show();
      }
    },
    [consoleManager]
  );
};
