/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  COMMENTS,
  DESCRIPTION,
  ENTRIES,
  ID,
  ITEM_ID,
  ITEM_TYPE,
  LIST_ITEM_ID,
  META,
  NAME,
  NAMESPACE_TYPE,
  OS_TYPES,
  TAGS,
} from '../../constants.mock';

import { UpdateExceptionListItemSchema } from './update_exception_list_item_schema';

export const getUpdateExceptionListItemSchemaMock = (): UpdateExceptionListItemSchema => ({
  _version: undefined,
  comments: COMMENTS,
  description: DESCRIPTION,
  entries: ENTRIES,
  id: ID,
  item_id: LIST_ITEM_ID,
  meta: META,
  name: NAME,
  namespace_type: NAMESPACE_TYPE,
  os_types: ['linux'],
  tags: TAGS,
  type: ITEM_TYPE,
});

/**
 * Useful for end to end tests and other mechanisms which want to fill in the values
 * after doing a get of the structure.
 */
export const getUpdateMinimalExceptionListItemSchemaMock = (): UpdateExceptionListItemSchema => ({
  description: DESCRIPTION,
  entries: ENTRIES,
  item_id: ITEM_ID,
  name: NAME,
  os_types: OS_TYPES,
  type: ITEM_TYPE,
});
