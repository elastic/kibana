/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  COMMENTS,
  DESCRIPTION,
  ENTRIES,
  ITEM_ID,
  ITEM_TYPE,
  LIST_ID,
  META,
  NAME,
  NAMESPACE_TYPE,
  OS_TYPES,
  TAGS,
} from '../../constants.mock';

import { CreateExceptionListItemSchema } from './create_exception_list_item_schema';

export const getCreateExceptionListItemSchemaMock = (): CreateExceptionListItemSchema => ({
  comments: COMMENTS,
  description: DESCRIPTION,
  entries: ENTRIES,
  item_id: undefined,
  list_id: LIST_ID,
  meta: META,
  name: NAME,
  namespace_type: NAMESPACE_TYPE,
  os_types: OS_TYPES,
  tags: TAGS,
  type: ITEM_TYPE,
});

/**
 * Useful for end to end testing
 */
export const getCreateExceptionListItemMinimalSchemaMock = (): CreateExceptionListItemSchema => ({
  description: DESCRIPTION,
  entries: ENTRIES,
  item_id: ITEM_ID,
  list_id: LIST_ID,
  name: NAME,
  os_types: OS_TYPES,
  type: ITEM_TYPE,
});

/**
 * Useful for end to end testing
 */
export const getCreateExceptionListItemMinimalSchemaMockWithoutId = (): CreateExceptionListItemSchema => ({
  description: DESCRIPTION,
  entries: ENTRIES,
  list_id: LIST_ID,
  name: NAME,
  os_types: OS_TYPES,
  type: ITEM_TYPE,
});
