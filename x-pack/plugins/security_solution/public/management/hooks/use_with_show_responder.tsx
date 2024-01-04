/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import type { ConsoleResponseActionCommands } from '../../../common/endpoint/service/response_actions/constants';
import { isResponseActionSupported } from '../../../common/endpoint/service/response_actions/is_response_action_supported';
import { HeaderSentinelOneInfo } from '../components/endpoint_responder/components/header_info/sentinel_one/header_sentinel_one_info';

import { useUserPrivileges } from '../../common/components/user_privileges';
import {
  ActionLogButton,
  getEndpointConsoleCommands,
  OfflineCallout,
} from '../components/endpoint_responder';
import { useConsoleManager } from '../components/console';
import { MissingEncryptionKeyCallout } from '../components/missing_encryption_key_callout';
import type { SentinelOneAgentInfo } from '../../../common/types';
import { RESPONDER_PAGE_TITLE } from './translations';
import { getCommandKey } from '../components/endpoint_response_actions_list/components/hooks';

type ShowResponseActionsConsole = (agentInfo: SentinelOneAgentInfo) => void;
export const useWithShowResponder = (): ShowResponseActionsConsole => {
  const consoleManager = useConsoleManager();
  const endpointPrivileges = useUserPrivileges().endpointPrivileges;

  return useCallback(
    (agentInfo: SentinelOneAgentInfo) => {
      // If no authz, just exit and log something to the console
      if (!endpointPrivileges.canAccessResponseConsole) {
        window.console.error(
          new Error(`Access denied to ${agentInfo.agent.type} response actions console`)
        );
        return;
      }

      const endpointAgentId = agentInfo.agent.id;
      const endpointRunningConsole = consoleManager.getOne(endpointAgentId);

      if (endpointRunningConsole) {
        endpointRunningConsole.show();
      } else {
        consoleManager
          .register({
            id: endpointAgentId,
            meta: {
              sentinel_one: agentInfo,
            },
            consoleProps: {
              commands: getEndpointConsoleCommands({
                endpointAgentId,
                endpointCapabilities: ['isolation'],
                endpointPrivileges,
              }).filter((command) =>
                command.name !== 'status'
                  ? isResponseActionSupported(
                      agentInfo.agent.type,
                      getCommandKey(command.name as ConsoleResponseActionCommands),
                      'manual'
                    )
                  : false
              ),
              'data-test-subj': 'agentResponseActionsConsole',
              storagePrefix: 'xpack.securitySolution.Responder',
              TitleComponent: () => <HeaderSentinelOneInfo agentInfo={agentInfo} />,
            },
            PageTitleComponent: () => <>{RESPONDER_PAGE_TITLE}</>,
            ActionComponents: endpointPrivileges.canReadActionsLogManagement
              ? [ActionLogButton]
              : undefined,
            PageBodyComponent: () => (
              <>
                <OfflineCallout endpointId={endpointAgentId} />
                <MissingEncryptionKeyCallout />
              </>
            ),
          })
          .show();
      }
    },
    [endpointPrivileges, consoleManager]
  );
};
