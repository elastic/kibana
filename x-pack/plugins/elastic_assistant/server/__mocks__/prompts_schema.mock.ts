/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import { EsPromptsSchema } from '../ai_assistant_data_clients/prompts/types';
import {
  PerformPromptsBulkActionRequestBody,
  PromptCreateProps,
  PromptResponse,
  PromptUpdateProps,
} from '@kbn/elastic-assistant-common/impl/schemas/prompts/bulk_crud_prompts_route.gen';

export const getPromptsSearchEsMock = () => {
  const searchResponse: estypes.SearchResponse<EsPromptsSchema> = {
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
            '@timestamp': '2019-12-13T16:40:33.400Z',
            created_at: '2019-12-13T16:40:33.400Z',
            updated_at: '2019-12-13T16:40:33.400Z',
            namespace: 'default',
            id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
            content: 'test content',
            name: 'test',
            prompt_type: 'quick',
            consumer: 'securitySolutionUI',
            categories: [],
            color: 'red',
            created_by: 'elastic',
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

export const getCreatePromptSchemaMock = (): PromptCreateProps => ({
  name: 'test',
  content: 'test content',
  isNewConversationDefault: false,
  consumer: 'securitySolutionUI',
  categories: [],
  color: 'red',
  isDefault: false,
  promptType: 'quick',
});

export const getUpdatePromptSchemaMock = (promptId = 'prompt-1'): PromptUpdateProps => ({
  content: 'test content',
  isNewConversationDefault: false,
  consumer: 'securitySolutionUI',
  categories: [],
  color: 'red',
  isDefault: false,
  id: promptId,
});

export const getPromptMock = (params: PromptCreateProps | PromptUpdateProps): PromptResponse => ({
  id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
  content: 'test content',
  name: 'test',
  promptType: 'quick',
  isDefault: false,
  ...params,
  createdAt: '2019-12-13T16:40:33.400Z',
  updatedAt: '2019-12-13T16:40:33.400Z',
  namespace: 'default',
  users: [
    {
      name: 'elastic',
    },
  ],
});

export const getQueryPromptParams = (isUpdate?: boolean): PromptCreateProps | PromptUpdateProps => {
  return isUpdate
    ? {
        content: 'test 2',
        name: 'test',
        promptType: 'quick',
        isDefault: false,
        isNewConversationDefault: true,
        consumer: 'securitySolutionUI',
        categories: [],
        color: 'red',
        id: '1',
      }
    : {
        content: 'test 2',
        name: 'test',
        promptType: 'quick',
        isDefault: false,
        isNewConversationDefault: true,
        consumer: 'securitySolutionUI',
        categories: [],
        color: 'red',
      };
};

export const getPerformBulkActionSchemaMock = (): PerformPromptsBulkActionRequestBody => ({
  create: [getQueryPromptParams(false) as PromptCreateProps],
  delete: {
    ids: ['99403909-ca9b-49ba-9d7a-7e5320e68d05'],
  },
  update: [getQueryPromptParams(true) as PromptUpdateProps],
});
