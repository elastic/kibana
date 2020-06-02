/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Operator } from './types';

export const getExceptionItemMock = (): ExceptionListItemSchema => ({
  id: 'uuid_here',
  item_id: 'item-id',
  created_at: '2020-04-23T00:19:13.289Z',
  created_by: 'user_name',
  list_id: 'test-exception',
  tie_breaker_id: '77fd1909-6786-428a-a671-30229a719c1f',
  updated_at: '2020-04-23T00:19:13.289Z',
  updated_by: 'user_name',
  namespace_type: 'single',
  name: '',
  description: 'This is a description',
  comments: [
    {
      user: 'user_name',
      timestamp: '2020-04-23T00:19:13.289Z',
      comment: 'Comment goes here',
    },
  ],
  _tags: ['os:windows'],
  tags: [],
  type: 'simple',
  entries: [
    {
      field: 'actingProcess.file.signer',
      type: 'match',
      operator: Operator.INCLUSION,
      value: 'Elastic, N.V.',
    },
    {
      field: 'host.name',
      type: 'match',
      operator: Operator.EXCLUSION,
      value: 'Global Signer',
    },
    {
      field: 'file.signature',
      type: 'nested',
      entries: [
        {
          field: 'signer',
          type: 'match',
          operator: Operator.INCLUSION,
          value: 'Evil',
        },
        {
          field: 'trusted',
          type: 'match',
          operator: Operator.INCLUSION,
          value: 'true',
        },
      ],
    },
  ],
});
