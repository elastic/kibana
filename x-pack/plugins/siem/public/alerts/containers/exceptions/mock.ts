/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  CreateExceptionListItemSchemaPartial,
  CreateExceptionListSchemaPartial,
  ExceptionListItemSchema,
  ExceptionListSchema,
} from '../../../../../lists/common/schemas';

export const mockExceptionList: ExceptionListSchema = {
  id: '1',
  list_id: 'endpoint_list',
  _tags: ['endpoint', 'process', 'malware', 'os:linux'],
  tags: ['user added string for a tag', 'malware'],
  type: 'endpoint',
  description: 'This is a sample endpoint type exception',
  name: 'Sample Endpoint Exception List',
  created_at: '2020-04-23T00:19:13.289Z',
  created_by: 'user_name',
  tie_breaker_id: '77fd1909-6786-428a-a671-30229a719c1f',
  updated_at: '2020-04-23T00:19:13.289Z',
  updated_by: 'user_name',
  meta: {},
};

export const mockNewExceptionList: CreateExceptionListSchemaPartial = {
  list_id: 'endpoint_list',
  _tags: ['endpoint', 'process', 'malware', 'os:linux'],
  tags: ['user added string for a tag', 'malware'],
  type: 'endpoint',
  description: 'This is a sample endpoint type exception',
  name: 'Sample Endpoint Exception List',
};

export const mockNewExceptionItem: CreateExceptionListItemSchemaPartial = {
  list_id: 'endpoint_list',
  item_id: 'endpoint_list_item',
  _tags: ['endpoint', 'process', 'malware', 'os:linux'],
  tags: ['user added string for a tag', 'malware'],
  type: 'simple',
  description: 'This is a sample endpoint type exception',
  name: 'Sample Endpoint Exception List',
  entries: [
    {
      field: 'actingProcess.file.signer',
      operator: 'included',
      match: 'Elastic, N.V.',
      match_any: undefined,
    },
    {
      field: 'event.category',
      operator: 'included',
      match_any: ['process', 'malware'],
      match: undefined,
    },
  ],
};

export const mockExceptionItem: ExceptionListItemSchema = {
  id: '1',
  created_at: '2020-04-23T00:19:13.289Z',
  created_by: 'user_name',
  tie_breaker_id: '77fd1909-6786-428a-a671-30229a719c1f',
  updated_at: '2020-04-23T00:19:13.289Z',
  updated_by: 'user_name',
  list_id: 'endpoint_list',
  item_id: 'endpoint_list_item',
  comment: [],
  meta: {},
  _tags: ['endpoint', 'process', 'malware', 'os:linux'],
  tags: ['user added string for a tag', 'malware'],
  type: 'simple',
  description: 'This is a sample endpoint type exception',
  name: 'Sample Endpoint Exception List',
  entries: [
    {
      field: 'actingProcess.file.signer',
      operator: 'included',
      match: 'Elastic, N.V.',
      match_any: undefined,
    },
    {
      field: 'event.category',
      operator: 'included',
      match_any: ['process', 'malware'],
      match: undefined,
    },
  ],
};
