/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FILTER, NAMESPACE_TYPE } from '../../constants.mock';

import {
  FindExceptionListSchema,
  FindExceptionListSchemaDecoded,
} from './find_exception_list_schema';

export const getFindExceptionListSchemaMock = (): FindExceptionListSchema => ({
  filter: FILTER,
  namespace_type: NAMESPACE_TYPE,
  page: '1',
  per_page: '25',
  sort_field: undefined,
  sort_order: undefined,
});

export const getFindExceptionListSchemaDecodedMock = (): FindExceptionListSchemaDecoded => ({
  filter: FILTER,
  namespace_type: NAMESPACE_TYPE,
  page: 1,
  per_page: 25,
  sort_field: undefined,
  sort_order: undefined,
});
