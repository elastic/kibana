/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  COMMENTS,
  DESCRIPTION,
  ENTRIES,
  ITEM_TYPE,
  LIST_ID,
  META,
  NAME,
  NAMESPACE_TYPE,
  TAGS,
  _TAGS,
} from '../../constants.mock';

import { CreateExceptionListItemSchema } from './create_exception_list_item_schema';

export const getCreateExceptionListItemSchemaMock = (): CreateExceptionListItemSchema => ({
  _tags: _TAGS,
  comments: COMMENTS,
  description: DESCRIPTION,
  entries: ENTRIES,
  item_id: undefined,
  list_id: LIST_ID,
  meta: META,
  name: NAME,
  namespace_type: NAMESPACE_TYPE,
  tags: TAGS,
  type: ITEM_TYPE,
});
