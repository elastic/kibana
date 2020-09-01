/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ID, LIST_ITEM_ID, META, VALUE } from '../../constants.mock';

import { UpdateListItemSchema } from './update_list_item_schema';

export const getUpdateListItemSchemaMock = (): UpdateListItemSchema => ({
  id: ID,
  meta: META,
  value: VALUE,
});

/**
 * Useful for end to end testing
 */
export const getUpdateMinimalListItemSchemaMock = (): UpdateListItemSchema => ({
  id: LIST_ITEM_ID,
  value: VALUE,
});
