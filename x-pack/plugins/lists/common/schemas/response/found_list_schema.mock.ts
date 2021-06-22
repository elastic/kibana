/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FoundListSchema } from '@kbn/securitysolution-io-ts-list-types';

import { getListResponseMock } from './list_schema.mock';

export const getFoundListSchemaMock = (): FoundListSchema => ({
  cursor: '123',
  data: [getListResponseMock()],
  page: 1,
  per_page: 1,
  total: 1,
});
