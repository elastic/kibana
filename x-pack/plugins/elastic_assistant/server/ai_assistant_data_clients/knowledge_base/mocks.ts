/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  KnowledgeBaseEntryCreateProps,
  KnowledgeBaseEntryResponse,
} from '@kbn/elastic-assistant-common';
import { estypes } from '@elastic/elasticsearch';
import type { AuthenticatedUser } from '@kbn/core-security-common';
import { EsKnowledgeBaseEntrySchema } from './types';
export const mockUser = {
  username: 'my_username',
  authentication_realm: {
    type: 'my_realm_type',
    name: 'my_realm_name',
  },
} as AuthenticatedUser;

const indexEntry: EsKnowledgeBaseEntrySchema = {
  id: '1234',
  '@timestamp': '2020-04-20T15:25:31.830Z',
  created_at: '2020-04-20T15:25:31.830Z',
  created_by: 'elastic',
  updated_at: '2020-04-20T15:25:31.830Z',
  updated_by: 'elastic',
  name: 'test',
  namespace: 'test',
  type: 'index',
  index: 'test',
  field: 'test',
  description: 'test',
  query_description: 'test',
  input_schema: [
    {
      field_name: 'test',
      field_type: 'test',
      description: 'test',
    },
  ],
};
const documentEntry: EsKnowledgeBaseEntrySchema = {
  id: '5678',
  '@timestamp': '2020-04-20T15:25:31.830Z',
  created_at: '2020-04-20T15:25:31.830Z',
  created_by: 'elastic',
  updated_at: '2020-04-20T15:25:31.830Z',
  updated_by: 'elastic',
  name: 'test',
  namespace: 'test',
  type: 'document',
  kb_resource: 'test',
  required: true,
  source: 'test',
  text: 'test',
};
export const getKnowledgeBaseEntryResponseMock = (): KnowledgeBaseEntryResponse => ({
  id: '1',
  createdAt: '2020-04-20T15:25:31.830Z',
  createdBy: 'elastic',
  updatedAt: '2020-04-20T15:25:31.830Z',
  updatedBy: 'elastic',
  users: [],
  name: 'test',
  namespace: 'test',
  type: 'index',
  index: 'test',
  field: 'test',
  description: 'test',
  queryDescription: 'test',
  inputSchema: [{ fieldName: 'test', fieldType: 'test', description: 'test' }],
  outputFields: [],
});

export const getSearchKnowledgeBaseEntryMock =
  (): estypes.SearchResponse<EsKnowledgeBaseEntrySchema> => ({
    _scroll_id: '123',
    _shards: {
      failed: 0,
      skipped: 0,
      successful: 0,
      total: 0,
    },
    hits: {
      hits: [
        {
          _id: '1',
          _index: '',
          _score: 0,
          _source: indexEntry,
        },
        {
          _id: '1',
          _index: '',
          _score: 0,
          _source: documentEntry,
        },
      ],
      max_score: 0,
      total: 1,
    },
    timed_out: false,
    took: 10,
  });

export const getCreateKnowledgeBaseEntryMock = (): KnowledgeBaseEntryCreateProps => ({
  type: 'document',
  source: 'test',
  text: 'test',
  name: 'test',
  kbResource: 'test',
});
