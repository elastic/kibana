/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ImportExceptionsResponseSchema } from '@kbn/securitysolution-io-ts-list-types';

export const getImportExceptionsResponseSchemaMock = (): ImportExceptionsResponseSchema => ({
  errors: [],
  success: true,
  success_count: 2,
  success_count_exception_list_items: 1,
  success_count_exception_lists: 1,
  success_exception_list_items: true,
  success_exception_lists: true,
});
