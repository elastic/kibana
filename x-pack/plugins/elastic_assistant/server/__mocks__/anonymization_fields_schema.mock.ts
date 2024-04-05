/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import {
  AnonymizationFieldCreateProps,
  AnonymizationFieldResponse,
  AnonymizationFieldUpdateProps,
  PerformBulkActionRequestBody,
} from '@kbn/elastic-assistant-common/impl/schemas/anonymization_fields/bulk_crud_anonymization_fields_route.gen';
import { EsAnonymizationFieldsSchema } from '../ai_assistant_data_clients/anonymization_fields/types';

export const getAnonymizationFieldsSearchEsMock = () => {
  const searchResponse: estypes.SearchResponse<EsAnonymizationFieldsSchema> = {
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
            field: 'testField',
            allowed: true,
            anonymized: false,
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

export const getCreateAnonymizationFieldSchemaMock = (): AnonymizationFieldCreateProps => ({
  field: 'testField',
  allowed: false,
  anonymized: true,
});

export const getUpdateAnonymizationFieldSchemaMock = (
  promptId = 'prompt-1'
): AnonymizationFieldUpdateProps => ({
  anonymized: true,
  allowed: false,
  id: promptId,
});

export const getAnonymizationFieldMock = (
  params: AnonymizationFieldCreateProps | AnonymizationFieldUpdateProps
): AnonymizationFieldResponse => ({
  id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
  field: 'testField',
  allowed: false,
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

export const getQueryAnonymizationFieldParams = (
  isUpdate?: boolean
): AnonymizationFieldCreateProps | AnonymizationFieldUpdateProps => {
  return isUpdate
    ? {
        field: 'testField',
        anonymized: true,
        allowed: false,
        id: '1',
      }
    : {
        field: 'test 2',
        anonymized: true,
        allowed: false,
      };
};

export const getPerformBulkActionSchemaMock = (): PerformBulkActionRequestBody => ({
  create: [getQueryAnonymizationFieldParams(false) as AnonymizationFieldCreateProps],
  delete: {
    ids: ['99403909-ca9b-49ba-9d7a-7e5320e68d05'],
  },
  update: [getQueryAnonymizationFieldParams(true) as AnonymizationFieldUpdateProps],
});
