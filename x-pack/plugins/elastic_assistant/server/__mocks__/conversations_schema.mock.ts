/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PerformBulkActionRequestBody } from '../schemas/conversations/bulk_crud_conversations_route.gen';
import {
  ConversationCreateProps,
  ConversationResponse,
  ConversationUpdateProps,
} from '../schemas/conversations/common_attributes.gen';

export const getCreateConversationSchemaMock = (): ConversationCreateProps => ({
  title: 'Welcome',
  apiConfig: {
    connectorId: '1',
    defaultSystemPromptId: 'Default',
    connectorTypeTitle: 'Test connector',
    model: 'model',
  },
  excludeFromLastConversationStorage: false,
  isDefault: true,
  messages: [
    {
      content: 'test content',
      role: 'user',
      timestamp: '2019-12-13T16:40:33.400Z',
      traceData: {
        traceId: '1',
        transactionId: '2',
      },
    },
  ],
});

export const getUpdateConversationSchemaMock = (
  conversationId = 'conversation-1'
): ConversationUpdateProps => ({
  title: 'Welcome 2',
  apiConfig: {
    connectorId: '2',
    defaultSystemPromptId: 'Default',
    connectorTypeTitle: 'Test connector',
    model: 'model',
  },
  excludeFromLastConversationStorage: false,
  messages: [
    {
      content: 'test content',
      role: 'user',
      timestamp: '2019-12-13T16:40:33.400Z',
      traceData: {
        traceId: '1',
        transactionId: '2',
      },
    },
  ],
  id: conversationId,
});

export const getConversationMock = (
  params: ConversationCreateProps | ConversationUpdateProps
): ConversationResponse => ({
  id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
  ...params,
  createdAt: '2019-12-13T16:40:33.400Z',
  updatedAt: '2019-12-13T16:40:33.400Z',
  namespace: 'default',
  user: {
    name: 'elastic',
  },
});

export const getQueryConversationParams = (): ConversationCreateProps | ConversationUpdateProps => {
  return {
    ...getBaseRuleParams(),
    type: 'query',
    language: 'kuery',
    query: 'user.name: root or user.name: admin',
    index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
    dataViewId: undefined,
    filters: [
      {
        query: {
          match_phrase: {
            'host.name': 'some-host',
          },
        },
      },
    ],
    savedId: undefined,
    alertSuppression: undefined,
    responseActions: undefined,
  };
};

export const getPerformBulkActionSchemaMock = (): PerformBulkActionRequestBody => ({
  query: '',
  ids: undefined,
  action: BulkActionTypeEnum.disable,
});
