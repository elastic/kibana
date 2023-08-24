/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FeaturesPluginStart, FeaturesPluginSetup } from '@kbn/features-plugin/public';
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
import type { Serializable } from '@kbn/utility-types';
import type {
  CreateChatCompletionResponse,
  CreateChatCompletionResponseChoicesInner,
} from 'openai';
import type { Observable } from 'rxjs';
import type { LensPublicSetup, LensPublicStart } from '@kbn/lens-plugin/public';
import type {
  DataViewsPublicPluginSetup,
  DataViewsPublicPluginStart,
} from '@kbn/data-views-plugin/public';
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

export interface ObservabilityAIAssistantChatService {
  chat: (options: { messages: Message[]; connectorId: string }) => Observable<PendingMessage>;
  getContexts: () => ContextDefinition[];
  getFunctions: (options?: { contexts?: string[]; filter?: string }) => FunctionDefinition[];
  hasRenderFunction: (name: string) => boolean;
  executeFunction: (
    name: string,
    args: string | undefined,
    signal: AbortSignal
  ) => Promise<{ content?: Serializable; data?: Serializable }>;
  renderFunction: (
    name: string,
    args: string | undefined,
    response: { data?: string; content?: string }
  ) => React.ReactNode;
}

export type ChatRegistrationFunction = ({}: {
  signal: AbortSignal;
  registerFunction: RegisterFunctionDefinition;
  registerContext: RegisterContextDefinition;
}) => Promise<void>;

export interface ObservabilityAIAssistantService {
  isEnabled: () => boolean;
  callApi: ObservabilityAIAssistantAPIClient;
  getCurrentUser: () => Promise<AuthenticatedUser>;
  start: ({}: { signal: AbortSignal }) => Promise<ObservabilityAIAssistantChatService>;
}

export interface ObservabilityAIAssistantPluginStart extends ObservabilityAIAssistantService {
  register: (fn: ChatRegistrationFunction) => void;
}

export interface ObservabilityAIAssistantPluginSetup {}
export interface ObservabilityAIAssistantPluginSetupDependencies {
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
  security: SecurityPluginSetup;
  features: FeaturesPluginSetup;
  observabilityShared: ObservabilitySharedPluginSetup;
  lens: LensPublicSetup;
  dataViews: DataViewsPublicPluginSetup;
}
export interface ObservabilityAIAssistantPluginStartDependencies {
  security: SecurityPluginStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  observabilityShared: ObservabilitySharedPluginStart;
  features: FeaturesPluginStart;
  lens: LensPublicStart;
  dataViews: DataViewsPublicPluginStart;
}

export interface ConfigSchema {}
