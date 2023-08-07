/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  ObservabilitySharedPluginSetup,
  ObservabilitySharedPluginStart,
} from '@kbn/observability-shared-plugin/public';
import type {
  AuthenticatedUser,
  SecurityPluginSetup,
  SecurityPluginStart,
} from '@kbn/security-plugin/public';
import type {
  TriggersAndActionsUIPublicPluginSetup,
  TriggersAndActionsUIPublicPluginStart,
} from '@kbn/triggers-actions-ui-plugin/public';
import type { LensPublicStart, LensPublicSetup } from '@kbn/lens-plugin/public';
import type {
  CreateChatCompletionResponse,
  CreateChatCompletionResponseChoicesInner,
} from 'openai';
import type { Observable } from 'rxjs';
import { Serializable } from '@kbn/utility-types';
import type {
  ContextDefinition,
  FunctionDefinition,
  Message,
  RegisterContextDefinition,
  RegisterFunctionDefinition,
} from '../common/types';
import type { ObservabilityAIAssistantAPIClient } from './api';

/* eslint-disable @typescript-eslint/no-empty-interface*/

export type CreateChatCompletionResponseChunk = Omit<CreateChatCompletionResponse, 'choices'> & {
  choices: Array<
    Omit<CreateChatCompletionResponseChoicesInner, 'message'> & {
      delta: { content?: string; function_call?: { name?: string; arguments?: string } };
    }
  >;
};

export interface PendingMessage {
  message: Message['message'];
  aborted?: boolean;
  error?: any;
}

export interface ObservabilityAIAssistantService {
  isEnabled: () => boolean;
  chat: (options: { messages: Message[]; connectorId: string }) => Observable<PendingMessage>;
  callApi: ObservabilityAIAssistantAPIClient;
  getCurrentUser: () => Promise<AuthenticatedUser>;
  getContexts: () => ContextDefinition[];
  getFunctions: (options?: { contexts?: string[]; filter?: string }) => FunctionDefinition[];
  executeFunction: (
    name: string,
    args: string | undefined,
    signal: AbortSignal
  ) => Promise<{ content?: Serializable; data?: Serializable }>;
  renderFunction: (
    name: string,
    args: string | undefined,
    response: { data?: Serializable; content?: Serializable }
  ) => React.ReactNode;
}

export interface ObservabilityAIAssistantPluginStart extends ObservabilityAIAssistantService {
  registerContext: RegisterContextDefinition;
  registerFunction: RegisterFunctionDefinition;
}

export interface ObservabilityAIAssistantPluginSetup {}
export interface ObservabilityAIAssistantPluginSetupDependencies {
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
  security: SecurityPluginSetup;
  observabilityShared: ObservabilitySharedPluginSetup;
  lens: LensPublicSetup;
}
export interface ObservabilityAIAssistantPluginStartDependencies {
  security: SecurityPluginStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  observabilityShared: ObservabilitySharedPluginStart;
  lens: LensPublicStart;
}

export interface ConfigSchema {}
