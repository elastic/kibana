/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { getConversationMock, getQueryConversationParams } from './conversations_schema.mock';
import { estypes } from '@elastic/elasticsearch';
import { ConversationResponse } from '../schemas/conversations/common_attributes.gen';

export const responseMock = {
  create: httpServerMock.createResponseFactory,
};

export interface FindHit<T = ConversationResponse> {
  page: number;
  perPage: number;
  total: number;
  data: T[];
}

export const getEmptyFindResult = (): FindHit => ({
  page: 1,
  perPage: 1,
  total: 0,
  data: [],
});

export const getFindConversationsResultWithSingleHit = (): FindHit => ({
  page: 1,
  perPage: 1,
  total: 1,
  data: [getConversationMock(getQueryConversationParams(true))],
});

export const getBasicEmptySearchResponse = (): estypes.SearchResponse<unknown> => ({
  took: 1,
  timed_out: false,
  _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
  hits: {
    hits: [],
    total: { relation: 'eq', value: 0 },
    max_score: 0,
  },
});
