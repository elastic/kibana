/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CommandResponseActionApiState } from './hooks/use_console_action_submitter';
import type { ManagedConsoleExtensionComponentProps } from '../console';
import type { HostMetadata } from '../../../../common/endpoint/types';
import type { CommandExecutionComponentProps } from '../console/types';

export interface EndpointCommandDefinitionMeta {
  endpointId: string;
}

export type EndpointResponderExtensionComponentProps = ManagedConsoleExtensionComponentProps<{
  endpoint: HostMetadata;
}>;

export type ActionRequestComponentProps<TArgs extends object = object> =
  CommandExecutionComponentProps<
    { comment?: string } & TArgs,
    CommandResponseActionApiState,
    EndpointCommandDefinitionMeta
  >;
