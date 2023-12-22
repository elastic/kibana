/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResponseActionAgentType } from '../../../../common/endpoint/service/response_actions/constants';
import type { CommandResponseActionApiState } from './hooks/use_console_action_submitter';
import type { ManagedConsoleExtensionComponentProps } from '../console';
import type {
  EndpointActionDataParameterTypes,
  HostMetadata,
} from '../../../../common/endpoint/types';
import type { CommandExecutionComponentProps } from '../console/types';

export interface EndpointCommandDefinitionMeta {
  endpointId: string;
}

// TODO: sentinel one agent info
// undecided yet
interface SentinelOneAgentInfo {
  agentId: string;
  name: string;
  last_seen: string;
  os: string;
}

export type EndpointResponderExtensionComponentProps = ManagedConsoleExtensionComponentProps<{
  [K in ResponseActionAgentType]?: K extends 'endpoint'
    ? HostMetadata
    : K extends 'sentinel_one'
    ? SentinelOneAgentInfo
    : never;
}>;

export type ActionRequestComponentProps<
  TArgs extends object = object,
  TActionOutputContent extends object = object,
  TParameters extends EndpointActionDataParameterTypes = EndpointActionDataParameterTypes
> = CommandExecutionComponentProps<
  { comment?: string } & TArgs,
  CommandResponseActionApiState<TActionOutputContent, TParameters>,
  EndpointCommandDefinitionMeta
>;
