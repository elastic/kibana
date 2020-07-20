/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FILTER, LIST_ID, NAMESPACE_TYPE } from '../../constants.mock';

import {
  FindExceptionListItemSchema,
  FindExceptionListItemSchemaDecoded,
} from './find_exception_list_item_schema';

export const getFindExceptionListItemSchemaMock = (): FindExceptionListItemSchema => ({
  filter: FILTER,
  list_id: LIST_ID,
  namespace_type: NAMESPACE_TYPE,
  page: '1',
  per_page: '25',
  sort_field: undefined,
  sort_order: undefined,
});

export const getFindExceptionListItemSchemaMultipleMock = (): FindExceptionListItemSchema => ({
  filter: 'name:Sofia Kovalevskaya,name:Hypatia,name:Sophie Germain',
  list_id: 'list-1,list-2,list-3',
  namespace_type: 'single,single,agnostic',
  page: '1',
  per_page: '25',
  sort_field: undefined,
  sort_order: undefined,
});

export const getFindExceptionListItemSchemaDecodedMock = (): FindExceptionListItemSchemaDecoded => ({
  filter: [FILTER],
  list_id: [LIST_ID],
  namespace_type: [NAMESPACE_TYPE],
  page: 1,
  per_page: 25,
  sort_field: undefined,
  sort_order: undefined,
});

export const getFindExceptionListItemSchemaDecodedMultipleMock = (): FindExceptionListItemSchemaDecoded => ({
  filter: ['name:Sofia Kovalevskaya', 'name:Hypatia', 'name:Sophie Germain'],
  list_id: ['list-1', 'list-2', 'list-3'],
  namespace_type: ['single', 'single', 'agnostic'],
  page: 1,
  per_page: 25,
  sort_field: undefined,
  sort_order: undefined,
});
