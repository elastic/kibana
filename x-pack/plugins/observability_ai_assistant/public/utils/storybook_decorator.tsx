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
import { ObservabilityAIAssistantProvider } from '../context/observability_ai_assistant_provider';
import { ObservabilityAIAssistantAPIClient } from '../api';
import type { Message } from '../../common';
import type { ObservabilityAIAssistantService, PendingMessage } from '../types';
import { buildFunctionElasticsearch, buildFunctionServiceSummary } from './builders';

const service: ObservabilityAIAssistantService = {
  isEnabled: () => true,
  chat: (options: { messages: Message[]; connectorId: string }) => new Observable<PendingMessage>(),
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
  getContexts: () => [],
  getFunctions: () => [buildFunctionElasticsearch(), buildFunctionServiceSummary()],
  executeFunction: async (
    name: string,
    args: string | undefined,
    signal: AbortSignal
  ): Promise<{ content?: Serializable; data?: Serializable }> => ({}),
  renderFunction: (name: string, response: {}) => <div>Hello! {name}</div>,
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
        <Story />
      </ObservabilityAIAssistantProvider>
    </KibanaContextProvider>
  );
}
