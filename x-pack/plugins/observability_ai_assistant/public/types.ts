/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  TriggersAndActionsUIPublicPluginSetup,
  TriggersAndActionsUIPublicPluginStart,
} from '@kbn/triggers-actions-ui-plugin/public';
import type { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/public';
import type {
  CreateChatCompletionResponse,
  CreateChatCompletionResponseChoicesInner,
} from 'openai';
import type { Observable } from 'rxjs';
import type { FeaturesPluginSetup, FeaturesPluginStart } from '@kbn/features-plugin/public';
import type { Message } from '../common/types';
import type { ObservabilityAIAssistantAPIClient } from './api';

/* eslint-disable @typescript-eslint/no-empty-interface*/

export type CreateChatCompletionResponseChunk = Omit<CreateChatCompletionResponse, 'choices'> & {
  choices: Array<
    Omit<CreateChatCompletionResponseChoicesInner, 'message'> & {
      delta: { content?: string; function_call?: { name?: string; args?: string } };
    }
  >;
};

export interface ObservabilityAIAssistantService {
  isEnabled: () => boolean;
  chat: (options: {
    messages: Message[];
    connectorId: string;
    signal: AbortSignal;
  }) => Promise<Observable<CreateChatCompletionResponseChunk>>;
  callApi: ObservabilityAIAssistantAPIClient;
}

export interface ObservabilityAIAssistantPluginStart extends ObservabilityAIAssistantService {}

export interface ObservabilityAIAssistantPluginSetup {}
export interface ObservabilityAIAssistantPluginSetupDependencies {
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
  security: SecurityPluginSetup;
  features: FeaturesPluginSetup;
}
export interface ObservabilityAIAssistantPluginStartDependencies {
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  security: SecurityPluginStart;
  features: FeaturesPluginStart;
}

export interface ConfigSchema {}
