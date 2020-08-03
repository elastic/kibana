/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CURSOR, FILTER, LIST_ID } from '../../constants.mock';

import { FindListItemSchema, FindListItemSchemaDecoded } from './find_list_item_schema';

export const getFindListItemSchemaMock = (): FindListItemSchema => ({
  cursor: CURSOR,
  filter: FILTER,
  list_id: LIST_ID,
  page: '1',
  per_page: '25',
  sort_field: undefined,
  sort_order: undefined,
});

export const getFindListItemSchemaDecodedMock = (): FindListItemSchemaDecoded => ({
  cursor: CURSOR,
  filter: FILTER,
  list_id: LIST_ID,
  page: 1,
  per_page: 25,
  sort_field: undefined,
  sort_order: undefined,
});
