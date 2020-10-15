/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ID, LIST_ID, VALUE } from '../../constants.mock';

import { DeleteListItemSchema } from './delete_list_item_schema';

export const getDeleteListItemSchemaMock = (): DeleteListItemSchema => ({
  id: ID,
  list_id: LIST_ID,
  value: VALUE,
});
