/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LIST_ID, LIST_ITEM_ID, VALUE } from '../../constants.mock';

import { ReadListItemSchema } from './read_list_item_schema';

export const getReadListItemSchemaMock = (): ReadListItemSchema => ({
  id: LIST_ITEM_ID,
  list_id: LIST_ID,
  value: VALUE,
});
