/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LIST_ID, LIST_ITEM_ID, META, VALUE } from '../../constants.mock';

import { CreateListItemSchema } from './create_list_item_schema';

export const getCreateListItemSchemaMock = (): CreateListItemSchema => ({
  id: LIST_ITEM_ID,
  list_id: LIST_ID,
  meta: META,
  value: VALUE,
});
