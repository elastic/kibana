/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FoundExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';

import { getExceptionListItemSchemaMock } from './exception_list_item_schema.mock';

export const getFoundExceptionListItemSchemaMock = (
  count: number = 1
): FoundExceptionListItemSchema => ({
  data: Array.from({ length: count }, getExceptionListItemSchemaMock),
  page: 1,
  per_page: 1,
  total: count,
});
