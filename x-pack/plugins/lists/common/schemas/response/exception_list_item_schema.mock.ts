/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExceptionListItemSchema } from './exception_list_item_schema';

export const getExceptionListItemSchemaMock = (): ExceptionListItemSchema => ({
  _tags: ['endpoint', 'process', 'malware', 'os:linux'],
  comment: [],
  created_at: '2020-04-23T00:19:13.289Z',
  created_by: 'user_name',
  description: 'This is a sample endpoint type exception',
  entries: [
    {
      field: 'actingProcess.file.signer',
      match: 'Elastic, N.V.',
      match_any: undefined,
      operator: 'included',
    },
    {
      field: 'event.category',
      match: undefined,
      match_any: ['process', 'malware'],
      operator: 'included',
    },
  ],
  id: '1',
  item_id: 'endpoint_list_item',
  list_id: 'endpoint_list',
  meta: {},
  name: 'Sample Endpoint Exception List',
  namespace_type: 'single',
  tags: ['user added string for a tag', 'malware'],
  tie_breaker_id: '77fd1909-6786-428a-a671-30229a719c1f',
  type: 'simple',
  updated_at: '2020-04-23T00:19:13.289Z',
  updated_by: 'user_name',
});
