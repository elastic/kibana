/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { isResponseActionSupported } from '../../../common/endpoint/service/response_actions/is_response_action_supported';
import { useUserPrivileges } from '../../common/components/user_privileges';
import {
  ActionLogButton,
  getEndpointConsoleCommands,
  HeaderEndpointInfo,
  OfflineCallout,
} from '../components/endpoint_responder';
import { useConsoleManager } from '../components/console';
import type { HostMetadata } from '../../../common/endpoint/types';
import { MissingEncryptionKeyCallout } from '../components/missing_encryption_key_callout';
import { RESPONDER_PAGE_TITLE } from './translations';
import { getCommandKey } from '../components/endpoint_response_actions_list/components/hooks';
import type { ConsoleResponseActionCommands } from '../../../common/endpoint/service/response_actions/constants';

type ShowEndpointResponseActionsConsole = (endpointMetadata: HostMetadata) => void;

export const useWithShowEndpointResponder = (): ShowEndpointResponseActionsConsole => {
  const consoleManager = useConsoleManager();
  const endpointPrivileges = useUserPrivileges().endpointPrivileges;

  return useCallback(
    (endpointMetadata: HostMetadata) => {
      // If no authz, just exit and log something to the console
      if (!endpointPrivileges.canAccessResponseConsole) {
        window.console.error(new Error('Access denied to endpoint response actions console'));
        return;
      }

      const endpointAgentId = endpointMetadata.agent.id;
      const endpointRunningConsole = consoleManager.getOne(endpointAgentId);

      if (endpointRunningConsole) {
        endpointRunningConsole.show();
      } else {
        consoleManager
          .register({
            id: endpointAgentId,
            meta: {
              agentId: endpointAgentId,
              hostName: endpointMetadata.host.hostname,
            },
            consoleProps: {
              commands: getEndpointConsoleCommands({
                agentType: 'endpoint',
                endpointAgentId,
                endpointCapabilities: endpointMetadata.Endpoint.capabilities ?? [],
                endpointPrivileges,
              }).filter((command) =>
                command.name !== 'status'
                  ? isResponseActionSupported(
                      'endpoint',
                      getCommandKey(command.name as ConsoleResponseActionCommands),
                      'manual'
                    )
                  : true
              ),
              'data-test-subj': 'endpointResponseActionsConsole',
              storagePrefix: 'xpack.securitySolution.Responder',
              TitleComponent: () => <HeaderEndpointInfo endpointId={endpointAgentId} />,
            },
            PageTitleComponent: () => <>{RESPONDER_PAGE_TITLE}</>,
            PageBodyComponent: () => (
              <>
                <OfflineCallout endpointId={endpointAgentId} />
                <MissingEncryptionKeyCallout />
              </>
            ),
            ActionComponents: endpointPrivileges.canReadActionsLogManagement
              ? [ActionLogButton]
              : undefined,
          })
          .show();
      }
    },
    [endpointPrivileges, consoleManager]
  );
};
