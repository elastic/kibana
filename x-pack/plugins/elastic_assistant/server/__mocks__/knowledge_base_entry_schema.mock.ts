/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import {
  KnowledgeBaseEntryCreateProps,
  KnowledgeBaseEntryResponse,
  KnowledgeBaseEntryUpdateProps,
} from '@kbn/elastic-assistant-common';
import { EsKnowledgeBaseEntrySchema } from '../ai_assistant_data_clients/knowledge_base/types';

const documentEntry: EsKnowledgeBaseEntrySchema = {
  id: '5678',
  '@timestamp': '2020-04-20T15:25:31.830Z',
  created_at: '2020-04-20T15:25:31.830Z',
  created_by: 'elastic',
  updated_at: '2020-04-20T15:25:31.830Z',
  updated_by: 'elastic',
  name: 'test',
  namespace: 'default',
  type: 'document',
  kb_resource: 'test',
  required: true,
  source: 'test',
  text: 'test',
  users: [
    {
      name: 'elastic',
      id: 'elastic1',
    },
  ],
};

export const getKnowledgeBaseEntrySearchEsMock = () => {
  const searchResponse: estypes.SearchResponse<EsKnowledgeBaseEntrySchema> = {
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
          _id: '1',
          _index: '',
          _score: 0,
          _source: documentEntry,
        },
      ],
    },
  };
  return searchResponse;
};

export const getCreateKnowledgeBaseEntrySchemaMock = (
  rest?: Partial<KnowledgeBaseEntryCreateProps>
): KnowledgeBaseEntryCreateProps => {
  const { type = 'document', ...restProps } = rest ?? {};
  if (type === 'document') {
    return {
      type: 'document',
      source: 'test',
      text: 'test',
      name: 'test',
      kbResource: 'test',
      ...restProps,
    };
  }
  return {
    type: 'index',
    name: 'test',
    index: 'test',
    field: 'test',
    description: 'test',
    queryDescription: 'test',
    inputSchema: [
      {
        fieldName: 'test',
        fieldType: 'test',
        description: 'test',
      },
    ],
    ...restProps,
  };
};

export const getUpdateKnowledgeBaseEntrySchemaMock = (
  entryId = 'entry-1'
): KnowledgeBaseEntryUpdateProps => ({
  name: 'another 2',
  namespace: 'default',
  type: 'document',
  source: 'test',
  text: 'test',
  kbResource: 'test',
  id: entryId,
});

export const getKnowledgeBaseEntryMock = (
  params: KnowledgeBaseEntryCreateProps | KnowledgeBaseEntryUpdateProps = {
    name: 'test',
    namespace: 'default',
    type: 'document',
    text: 'test',
    source: 'test',
    kbResource: 'test',
    required: true,
  }
): KnowledgeBaseEntryResponse => ({
  id: '1',
  ...params,
  createdBy: 'elastic',
  updatedBy: 'elastic',
  createdAt: '2020-04-20T15:25:31.830Z',
  updatedAt: '2020-04-20T15:25:31.830Z',
  namespace: 'default',
  users: [
    {
      name: 'elastic',
      id: 'elastic1',
    },
  ],
});

export const getQueryKnowledgeBaseEntryParams = (
  isUpdate?: boolean
): KnowledgeBaseEntryCreateProps | KnowledgeBaseEntryUpdateProps => {
  return isUpdate
    ? getUpdateKnowledgeBaseEntrySchemaMock()
    : getCreateKnowledgeBaseEntrySchemaMock();
};
