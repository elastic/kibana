/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { AuthenticatedUser } from '@kbn/security-plugin-types-common';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import React from 'react';
import { Observable } from 'rxjs';
import type { StreamingChatResponseEventWithoutError } from '../common/conversation_complete';
import type { ObservabilityAIAssistantAPIClient } from './api';
import type {
  ObservabilityAIAssistantChatService,
  ObservabilityAIAssistantPluginSetup,
  ObservabilityAIAssistantPluginStart,
  ObservabilityAIAssistantService,
} from './types';
import { buildFunctionElasticsearch, buildFunctionServiceSummary } from './utils/builders';

export const mockChatService: ObservabilityAIAssistantChatService = {
  analytics: {
    optIn: () => {},
    reportEvent: () => {},
    telemetryCounter$: new Observable(),
  },
  chat: (options) => new Observable<StreamingChatResponseEventWithoutError>(),
  complete: (options) => new Observable<StreamingChatResponseEventWithoutError>(),
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
    return mockChatService;
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

function createSetupContract(): ObservabilityAIAssistantPluginSetup {
  return {};
}

function createStartContract(): ObservabilityAIAssistantPluginStart {
  return {
    service: mockService,

    ObservabilityAIAssistantActionMenuItem: (() => (
      // eslint-disable-next-line @kbn/i18n/strings_should_be_translated_with_i18n
      <div>Im a button</div>
    )) as unknown as ObservabilityAIAssistantPluginStart['ObservabilityAIAssistantActionMenuItem'],
    ObservabilityAIAssistantContextualInsight: (
      // eslint-disable-next-line @kbn/i18n/strings_should_be_translated_with_i18n
      <div>I give insight</div>
    ) as unknown as ObservabilityAIAssistantPluginStart['ObservabilityAIAssistantContextualInsight'],
    useGenAIConnectors: () => ({
      loading: false,
      selectConnector: () => {},
      reloadConnectors: () => {},
    }),
  };
}

export const observabilityAIAssistantPluginMock = {
  createSetupContract,
  createStartContract,
};
