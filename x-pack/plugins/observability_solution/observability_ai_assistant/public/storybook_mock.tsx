/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { noop } from 'lodash';
import React from 'react';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { AssistantScope } from '@kbn/ai-assistant-common';
import { ChatCompletionChunkEvent, FunctionDefinition, MessageRole } from '.';
import type { StreamingChatResponseEventWithoutError } from '../common/conversation_complete';
import type { ObservabilityAIAssistantAPIClient } from './api';
import type { ObservabilityAIAssistantChatService, ObservabilityAIAssistantService } from './types';
import { buildFunctionElasticsearch, buildFunctionServiceSummary } from './utils/builders';

export const createStorybookChatService = (): ObservabilityAIAssistantChatService => ({
  sendAnalyticsEvent: () => {},
  chat: (options) => new Observable<ChatCompletionChunkEvent>(),
  complete: (options) => new Observable<StreamingChatResponseEventWithoutError>(),
  getFunctions: () => [buildFunctionElasticsearch(), buildFunctionServiceSummary()],
  renderFunction: (name) => (
    <div>
      {i18n.translate('xpack.observabilityAiAssistant.chatService.div.helloLabel', {
        defaultMessage: 'Hello',
      })}
      {name}
    </div>
  ),
  hasFunction: () => true,
  hasRenderFunction: () => true,
  getSystemMessage: () => ({
    '@timestamp': new Date().toISOString(),
    message: {
      role: MessageRole.System,
      content: 'System',
    },
  }),
  functions$: new BehaviorSubject<FunctionDefinition[]>(
    []
  ) as ObservabilityAIAssistantChatService['functions$'],
  getScopes: () => ['all'],
});

export const createStorybookService = (): ObservabilityAIAssistantService => ({
  isEnabled: () => true,
  start: async () => {
    return createStorybookChatService();
  },
  callApi: {} as ObservabilityAIAssistantAPIClient,
  register: () => {},
  setScreenContext: () => noop,
  getScreenContexts: () => [],
  conversations: {
    openNewConversation: noop,
    predefinedConversation$: new Observable(),
  },
  navigate: async () => of(),
  scope$: new BehaviorSubject<AssistantScope[]>([
    'all',
  ]) as ObservabilityAIAssistantService['scope$'],
  getScopes: () => ['all'],
  setScopes: () => {},
});
