/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ListItemIndexExistSchema } from './list_item_index_exist_schema';

export const getListItemIndexExistSchemaResponseMock = (): ListItemIndexExistSchema => ({
  list_index: true,
  list_item_index: true,
});
