/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { ComponentType } from 'react';
import { Observable } from 'rxjs';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { Serializable } from '@kbn/utility-types';
import type { AuthenticatedUser } from '@kbn/security-plugin/common';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { ObservabilityAIAssistantProvider } from '../context/observability_ai_assistant_provider';
import { ObservabilityAIAssistantAPIClient } from '../api';
import type { Message } from '../../common';
import type {
  ObservabilityAIAssistantChatService,
  ObservabilityAIAssistantService,
  PendingMessage,
} from '../types';
import { buildFunctionElasticsearch, buildFunctionServiceSummary } from './builders';
import { ObservabilityAIAssistantChatServiceProvider } from '../context/observability_ai_assistant_chat_service_provider';

const chatService: ObservabilityAIAssistantChatService = {
  chat: (options: { messages: Message[]; connectorId: string }) => new Observable<PendingMessage>(),
  getContexts: () => [],
  getFunctions: () => [buildFunctionElasticsearch(), buildFunctionServiceSummary()],
  executeFunction: async ({}: {
    name: string;
    args: string | undefined;
    messages: Message[];
    signal: AbortSignal;
  }): Promise<{ content?: Serializable; data?: Serializable }> => ({}),
  renderFunction: (name: string, args: string | undefined, response: {}) => (
    <div>Hello! {name}</div>
  ),
  hasRenderFunction: () => true,
};

const service: ObservabilityAIAssistantService = {
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
      <ObservabilityAIAssistantProvider value={service}>
        <ObservabilityAIAssistantChatServiceProvider value={chatService}>
          <Story />
        </ObservabilityAIAssistantChatServiceProvider>
      </ObservabilityAIAssistantProvider>
    </KibanaContextProvider>
  );
}
