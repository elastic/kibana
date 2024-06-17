/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { noop } from 'lodash';
import React from 'react';
import { Observable, of } from 'rxjs';
import type {
  ChatCompletionChunkEvent,
  StreamingChatResponseEventWithoutError,
} from '../common/conversation_complete';
import { MessageRole, ScreenContextActionDefinition } from '../common/types';
import type { ObservabilityAIAssistantAPIClient } from './api';
import type {
  ObservabilityAIAssistantChatService,
  ObservabilityAIAssistantPublicSetup,
  ObservabilityAIAssistantPublicStart,
  ObservabilityAIAssistantService,
} from './types';
import { buildFunctionElasticsearch, buildFunctionServiceSummary } from './utils/builders';

export const mockChatService: ObservabilityAIAssistantChatService = {
  sendAnalyticsEvent: noop,
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
};

export const mockService: ObservabilityAIAssistantService = {
  isEnabled: () => true,
  start: async () => {
    return mockChatService;
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
};

function createSetupContract(): ObservabilityAIAssistantPublicSetup {
  return {};
}

function createStartContract(): ObservabilityAIAssistantPublicStart {
  return {
    service: mockService,
    ObservabilityAIAssistantContextualInsight: (() => <></>) as any,
    ObservabilityAIAssistantChatServiceContext: React.createContext<any>(undefined),
    ObservabilityAIAssistantMultipaneFlyoutContext: React.createContext<any>(undefined),
    useChat: () => ({} as any),
    useObservabilityAIAssistantChatService: () => mockChatService,
    useGenAIConnectors: () => ({
      loading: false,
      selectConnector: () => {},
      reloadConnectors: () => {},
    }),
    useUserPreferredLanguage: () => ({
      LANGUAGE_OPTIONS: [{ label: 'English' }],
      selectedLanguage: 'English',
      setSelectedLanguage: () => {},
      getPreferredLanguage: () => 'English',
    }),
    getContextualInsightMessages: () => [],
    createScreenContextAction: () => ({} as ScreenContextActionDefinition<any>),
  };
}

export const observabilityAIAssistantPluginMock = {
  createSetupContract,
  createStartContract,
};
