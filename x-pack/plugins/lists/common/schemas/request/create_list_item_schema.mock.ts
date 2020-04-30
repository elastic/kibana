/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CreateListItemSchema } from './create_list_item_schema';

export const getCreateListItemSchemaMock = (): CreateListItemSchema => ({
  id: 'some-list-item-id',
  list_id: 'some-list-id',
  meta: {},
  value: '127.0.0.1',
});
