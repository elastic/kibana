/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FILTER } from '../../constants.mock';

import { FindListSchema, FindListSchemaEncoded } from './find_list_schema';

export const getFindListSchemaMock = (): FindListSchemaEncoded => ({
  filter: FILTER,
  page: '1',
  per_page: '25',
  sort_field: undefined,
  sort_order: undefined,
});

export const getFindListSchemaDecodedMock = (): FindListSchema => ({
  filter: FILTER,
  page: 1,
  per_page: 25,
  sort_field: undefined,
  sort_order: undefined,
});
