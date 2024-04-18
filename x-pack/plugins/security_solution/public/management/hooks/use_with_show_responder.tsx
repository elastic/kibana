/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiBetaBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import {
  TECHNICAL_PREVIEW,
  TECHNICAL_PREVIEW_TOOLTIP,
  UPGRADE_AGENT_FOR_RESPONDER,
} from '../../common/translations';
import { useLicense } from '../../common/hooks/use_license';
import type { ImmutableArray } from '../../../common/endpoint/types';
import {
  type ConsoleResponseActionCommands,
  RESPONSE_CONSOLE_COMMAND_TO_API_COMMAND_MAP,
  type ResponseActionAgentType,
} from '../../../common/endpoint/service/response_actions/constants';
import { isResponseActionSupported } from '../../../common/endpoint/service/response_actions/is_response_action_supported';
import { HeaderSentinelOneInfo } from '../components/endpoint_responder/components/header_info/sentinel_one/header_sentinel_one_info';

import { useUserPrivileges } from '../../common/components/user_privileges';
import {
  ActionLogButton,
  getEndpointConsoleCommands,
  HeaderEndpointInfo,
  OfflineCallout,
} from '../components/endpoint_responder';
import { useConsoleManager } from '../components/console';
import { MissingEncryptionKeyCallout } from '../components/missing_encryption_key_callout';
import { RESPONDER_PAGE_TITLE } from './translations';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';

type ShowResponseActionsConsole = (props: ResponderInfoProps) => void;

export interface BasicConsoleProps {
  agentId: string;
  hostName: string;
}

type ResponderInfoProps =
  | (BasicConsoleProps & {
      agentType: Extract<ResponseActionAgentType, 'endpoint'>;
      capabilities: ImmutableArray<string>;
    })
  | (BasicConsoleProps & {
      agentType: Exclude<ResponseActionAgentType, 'endpoint'>;
      capabilities: ImmutableArray<string>;
      platform: string;
    });

export const useWithShowResponder = (): ShowResponseActionsConsole => {
  const consoleManager = useConsoleManager();
  const endpointPrivileges = useUserPrivileges().endpointPrivileges;
  const isEnterpriseLicense = useLicense().isEnterprise();
  const isSentinelOneV1Enabled = useIsExperimentalFeatureEnabled(
    'responseActionsSentinelOneV1Enabled'
  );

  return useCallback(
    (props: ResponderInfoProps) => {
      const { agentId, agentType, capabilities, hostName } = props;
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
          }).map((command) => {
            if (command.name !== 'status') {
              return {
                ...command,
                helpHidden: !isResponseActionSupported(
                  agentType,
                  RESPONSE_CONSOLE_COMMAND_TO_API_COMMAND_MAP[
                    command.name as ConsoleResponseActionCommands
                  ],
                  'manual',
                  endpointPrivileges
                ),
              };
            } else if (agentType !== 'endpoint') {
              // do not show 'status' for non-endpoint agents
              return {
                ...command,
                helpHidden: true,
                validate: () => {
                  return UPGRADE_AGENT_FOR_RESPONDER(
                    agentType,
                    command.name as ConsoleResponseActionCommands
                  );
                },
              };
            }
            return command;
          }),
          'data-test-subj': `${agentType}ResponseActionsConsole`,
          storagePrefix: 'xpack.securitySolution.Responder',
          TitleComponent: () => {
            if (agentType === 'endpoint') {
              return <HeaderEndpointInfo endpointId={agentId} />;
            }
            if (agentType === 'sentinel_one') {
              return (
                <HeaderSentinelOneInfo
                  agentId={agentId}
                  hostName={hostName}
                  platform={props.platform}
                />
              );
            }
            return null;
          },
        };

        consoleManager
          .register({
            id: agentId,
            meta: {
              agentId,
              hostName,
            },
            consoleProps,
            PageTitleComponent: () => {
              if (isSentinelOneV1Enabled && agentType === 'sentinel_one') {
                return (
                  <EuiFlexGroup>
                    <EuiFlexItem>{RESPONDER_PAGE_TITLE}</EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiBetaBadge
                        label={TECHNICAL_PREVIEW}
                        tooltipContent={TECHNICAL_PREVIEW_TOOLTIP}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                );
              }
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
    [endpointPrivileges, isEnterpriseLicense, isSentinelOneV1Enabled, consoleManager]
  );
};
