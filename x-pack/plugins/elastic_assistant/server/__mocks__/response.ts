/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { getConversationSearchEsMock } from './conversations_schema.mock';
import { estypes } from '@elastic/elasticsearch';
import { EsConversationSchema } from '../ai_assistant_data_clients/conversations/types';
import { FindResponse } from '../ai_assistant_data_clients/find';
import { ConversationResponse } from '@kbn/elastic-assistant-common';
import { SearchEsPromptsSchema } from '../ai_assistant_data_clients/prompts/types';
import { getPromptsSearchEsMock } from './prompts_schema.mock';
import { SearchEsAnonymizationFieldsSchema } from '../ai_assistant_data_clients/anonymization_fields/types';
import { getAnonymizationFieldsSearchEsMock } from './anonymization_fields_schema.mock';

export const responseMock = {
  create: httpServerMock.createResponseFactory,
};

export const getEmptyFindResult = (): FindResponse<EsConversationSchema> => ({
  page: 1,
  perPage: 1,
  total: 0,
  data: getBasicEmptySearchResponse(),
});

export const getFindConversationsResultWithSingleHit = (): FindResponse<EsConversationSchema> => ({
  page: 1,
  perPage: 1,
  total: 1,
  data: getConversationSearchEsMock(),
});

export const getFindPromptsResultWithSingleHit = (): FindResponse<SearchEsPromptsSchema> => ({
  page: 1,
  perPage: 1,
  total: 1,
  data: getPromptsSearchEsMock(),
});

export const getFindAnonymizationFieldsResultWithSingleHit =
  (): FindResponse<SearchEsAnonymizationFieldsSchema> => ({
    page: 1,
    perPage: 1,
    total: 1,
    data: getAnonymizationFieldsSearchEsMock(),
  });

export const getBasicEmptySearchResponse = (): estypes.SearchResponse<EsConversationSchema> => ({
  took: 1,
  timed_out: false,
  _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
  hits: {
    hits: [],
    total: { relation: 'eq', value: 0 },
    max_score: 0,
  },
});

export const getConversationResponseMock = (
  timestamp: string = new Date().toISOString()
): ConversationResponse => ({
  id: 'test',
  title: 'test',
  apiConfig: {
    connectorId: '1',
    actionTypeId: '.gen-ai',
    defaultSystemPromptId: 'default-system-prompt',
    model: 'test-model',
    provider: 'OpenAI',
  },
  excludeFromLastConversationStorage: false,
  messages: [],
  replacements: {},
  createdAt: timestamp,
  namespace: 'default',
  isDefault: false,
  updatedAt: timestamp,
  timestamp,
  category: 'assistant',
  users: [
    {
      id: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
      name: 'elastic',
    },
  ],
});
