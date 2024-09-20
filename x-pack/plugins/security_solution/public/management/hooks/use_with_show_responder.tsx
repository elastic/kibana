/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { useLicense } from '../../common/hooks/use_license';
import type { MaybeImmutable } from '../../../common/endpoint/types';
import type { EndpointCapabilities } from '../../../common/endpoint/service/response_actions/constants';
import { type ResponseActionAgentType } from '../../../common/endpoint/service/response_actions/constants';
import { AgentInfo } from '../components/endpoint_responder/components/header_info/agent_info/agent_info';

import { useUserPrivileges } from '../../common/components/user_privileges';
import {
  ActionLogButton,
  getEndpointConsoleCommands,
  OfflineCallout,
} from '../components/endpoint_responder';
import { useConsoleManager } from '../components/console';
import { MissingEncryptionKeyCallout } from '../components/missing_encryption_key_callout';
import { RESPONDER_PAGE_TITLE } from './translations';

type ShowResponseActionsConsole = (props: ResponderInfoProps) => void;

export interface BasicConsoleProps {
  agentId: string;
  hostName: string;
  /** Required for Endpoint agents. */
  capabilities: MaybeImmutable<EndpointCapabilities[]>;
  platform: string;
}

type ResponderInfoProps =
  | (BasicConsoleProps & {
      agentType: Extract<ResponseActionAgentType, 'endpoint'>;
    })
  | (BasicConsoleProps & {
      agentType: Exclude<ResponseActionAgentType, 'endpoint'>;
    });

export const useWithShowResponder = (): ShowResponseActionsConsole => {
  const consoleManager = useConsoleManager();
  const endpointPrivileges = useUserPrivileges().endpointPrivileges;
  const isEnterpriseLicense = useLicense().isEnterprise();

  return useCallback(
    (props: ResponderInfoProps) => {
      const { agentId, agentType, capabilities, hostName, platform } = props;

      // If no authz, just exit and log something to the console
      if (agentType === 'endpoint' && !endpointPrivileges.canAccessResponseConsole) {
        window.console.error(new Error(`Access denied to ${agentType} response actions console`));
        return;
      }

      if (agentType !== 'endpoint' && !isEnterpriseLicense) {
        window.console.error(new Error(`Access denied to ${agentType} response actions console`));
        return;
      }

      const endpointRunningConsole = consoleManager.getOne(agentId);

      if (endpointRunningConsole) {
        endpointRunningConsole.show();
      } else {
        const consoleProps = {
          commands: getEndpointConsoleCommands({
            agentType,
            endpointAgentId: agentId,
            endpointCapabilities: capabilities,
            endpointPrivileges,
          }),
          'data-test-subj': `${agentType}ResponseActionsConsole`,
          storagePrefix: 'xpack.securitySolution.Responder',
          TitleComponent: () => {
            return (
              <>
                TEST!11
                <AgentInfo
                  agentId={agentId}
                  agentType={agentType}
                  hostName={hostName}
                  platform={platform}
                />
              </>
            );
          },
        };

        consoleManager
          .register<string>({
            id: agentId,
            meta: {
              agentId,
              agentType,
              hostName,
              capabilities,
              platform,
            },
            consoleProps,
            PageTitleComponent: () => {
              return <>{RESPONDER_PAGE_TITLE}</>;
            },
            ActionComponents: endpointPrivileges.canReadActionsLogManagement
              ? [ActionLogButton]
              : undefined,
            PageBodyComponent: () => (
              <>
                <OfflineCallout
                  endpointId={props.agentId}
                  agentType={agentType}
                  hostName={hostName}
                />
                <MissingEncryptionKeyCallout />
              </>
            ),
          })
          .show();
      }
    },
    [endpointPrivileges, isEnterpriseLicense, consoleManager]
  );
};
