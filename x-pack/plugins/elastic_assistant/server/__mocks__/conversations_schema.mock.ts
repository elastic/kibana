/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import {
  AppendConversationMessageRequestBody,
  PerformBulkActionRequestBody,
  ConversationCreateProps,
  ConversationResponse,
  ConversationUpdateProps,
} from '@kbn/elastic-assistant-common';
import { EsConversationSchema } from '../ai_assistant_data_clients/conversations/types';

export const getConversationSearchEsMock = () => {
  const searchResponse: estypes.SearchResponse<EsConversationSchema> = {
    took: 3,
    timed_out: false,
    _shards: {
      total: 2,
      successful: 2,
      skipped: 0,
      failed: 0,
    },
    hits: {
      total: {
        value: 1,
        relation: 'eq',
      },
      max_score: 0,
      hits: [
        {
          _index: 'foo',
          _id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
          _source: {
            category: 'assistant',
            '@timestamp': '2019-12-13T16:40:33.400Z',
            created_at: '2019-12-13T16:40:33.400Z',
            updated_at: '2019-12-13T16:40:33.400Z',
            namespace: 'default',
            id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
            title: 'test',
            exclude_from_last_conversation_storage: true,
            is_default: false,
            messages: [],
            replacements: [],
            users: [
              {
                name: 'elastic',
              },
            ],
          },
        },
      ],
    },
  };
  return searchResponse;
};

export const getCreateConversationSchemaMock = (): ConversationCreateProps => ({
  title: 'Welcome',
  apiConfig: {
    connectorId: '1',
    defaultSystemPromptId: 'Default',
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
  category: 'assistant',
});

export const getUpdateConversationSchemaMock = (
  conversationId = 'conversation-1'
): ConversationUpdateProps => ({
  title: 'Welcome 2',
  apiConfig: {
    connectorId: '2',
    defaultSystemPromptId: 'Default',
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

export const getAppendConversationMessagesSchemaMock =
  (): AppendConversationMessageRequestBody => ({
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

export const getConversationMock = (
  params: ConversationCreateProps | ConversationUpdateProps
): ConversationResponse => ({
  id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
  apiConfig: {
    connectorId: '1',
    defaultSystemPromptId: 'Default',
  },
  replacements: [],
  title: 'test',
  ...params,
  createdAt: '2019-12-13T16:40:33.400Z',
  updatedAt: '2019-12-13T16:40:33.400Z',
  namespace: 'default',
  category: 'assistant',
  users: [
    {
      name: 'elastic',
    },
  ],
});

export const getQueryConversationParams = (
  isUpdate?: boolean
): ConversationCreateProps | ConversationUpdateProps => {
  return isUpdate
    ? {
        title: 'Welcome 2',
        apiConfig: {
          connectorId: '2',
          defaultSystemPromptId: 'Default',
          model: 'model',
        },
        category: 'assistant',
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
        id: '1',
      }
    : {
        title: 'Welcome',
        category: 'assistant',
        apiConfig: {
          connectorId: '1',
          defaultSystemPromptId: 'Default',
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
      };
};

export const getPerformBulkActionSchemaMock = (): PerformBulkActionRequestBody => ({
  create: [getQueryConversationParams(false) as ConversationCreateProps],
  delete: {
    ids: ['99403909-ca9b-49ba-9d7a-7e5320e68d05'],
  },
  update: [getQueryConversationParams(true) as ConversationUpdateProps],
});
