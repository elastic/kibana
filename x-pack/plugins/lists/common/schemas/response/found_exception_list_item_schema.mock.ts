/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getExceptionListItemSchemaMock } from './exception_list_item_schema.mock';
import { FoundExceptionListItemSchema } from './found_exception_list_item_schema';

export const getFoundExceptionListItemSchemaMock = (): FoundExceptionListItemSchema => ({
  data: [getExceptionListItemSchemaMock()],
  page: 1,
  per_page: 1,
  total: 1,
});
