/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import { CreateExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { ENDPOINT_HOST_ISOLATION_EXCEPTIONS_LIST_ID } from '@kbn/securitysolution-list-constants';

export const createEmptyHostIsolationException = (): CreateExceptionListItemSchema => ({
  comments: [],
  description: '',
  entries: [
    {
      field: 'destination.ip',
      operator: 'included',
      type: 'match',
      value: '',
    },
  ],
  item_id: undefined,
  list_id: ENDPOINT_HOST_ISOLATION_EXCEPTIONS_LIST_ID,
  meta: {
    temporaryUuid: uuid.v4(),
  },
  name: '',
  namespace_type: 'agnostic',
  tags: ['policy:all'],
  type: 'simple',
  os_types: ['windows', 'linux', 'macos'],
});
