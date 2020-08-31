/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LIST_ITEM_ID, META, VALUE } from '../../constants.mock';

import { PatchListItemSchema } from './patch_list_item_schema';

export const getPathListItemSchemaMock = (): PatchListItemSchema => ({
  id: LIST_ITEM_ID,
  meta: META,
  value: VALUE,
});
