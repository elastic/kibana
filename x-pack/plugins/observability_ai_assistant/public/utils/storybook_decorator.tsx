/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { AuthenticatedUser } from '@kbn/security-plugin/common';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import React, { ComponentType } from 'react';
import { Observable } from 'rxjs';
import type { StreamingChatResponseEvent } from '../../common/conversation_complete';
import { ObservabilityAIAssistantAPIClient } from '../api';
import { ObservabilityAIAssistantChatServiceProvider } from '../context/observability_ai_assistant_chat_service_provider';
import { ObservabilityAIAssistantProvider } from '../context/observability_ai_assistant_provider';
import type {
  ObservabilityAIAssistantChatService,
  ObservabilityAIAssistantService,
  PendingMessage,
} from '../types';
import { buildFunctionElasticsearch, buildFunctionServiceSummary } from './builders';

const chatService: ObservabilityAIAssistantChatService = {
  analytics: {
    optIn: () => {},
    reportEvent: () => {},
    telemetryCounter$: new Observable(),
  },
  chat: (options) => new Observable<PendingMessage>(),
  complete: (options) => new Observable<StreamingChatResponseEvent>(),
  getContexts: () => [],
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
};

export const mockService: ObservabilityAIAssistantService = {
  isEnabled: () => true,
  start: async () => {
    return chatService;
  },
  callApi: {} as ObservabilityAIAssistantAPIClient,
  getCurrentUser: async (): Promise<AuthenticatedUser> => ({
    username: 'user',
    roles: [],
    enabled: true,
    authentication_realm: { name: 'foo', type: '' },
    lookup_realm: { name: 'foo', type: '' },
    authentication_provider: { name: '', type: '' },
    authentication_type: '',
    elastic_cloud_user: false,
  }),
  getLicense: () => new Observable(),
  getLicenseManagementLocator: () =>
    ({
      url: {},
      navigate: () => {},
    } as unknown as SharePluginStart),
  register: () => {},
};

export function KibanaReactStorybookDecorator(Story: ComponentType) {
  return (
    <KibanaContextProvider
      services={{
        triggersActionsUi: { getAddRuleFlyout: {} },
        uiSettings: {
          get: (setting: string) => {
            if (setting === 'dateFormat') {
              return 'MMM D, YYYY HH:mm';
            }
          },
        },
      }}
    >
      <ObservabilityAIAssistantProvider value={mockService}>
        <ObservabilityAIAssistantChatServiceProvider value={chatService}>
          <Story />
        </ObservabilityAIAssistantChatServiceProvider>
      </ObservabilityAIAssistantProvider>
    </KibanaContextProvider>
  );
}
