/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ID, ITEM_ID, NAMESPACE_TYPE } from '../../constants.mock';

import { ReadExceptionListItemSchema } from './read_exception_list_item_schema';

export const getReadExceptionListItemSchemaMock = (): ReadExceptionListItemSchema => ({
  id: ID,
  item_id: ITEM_ID,
  namespace_type: NAMESPACE_TYPE,
});
