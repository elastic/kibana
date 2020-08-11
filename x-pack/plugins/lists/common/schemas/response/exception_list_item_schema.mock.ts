/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  COMMENTS,
  DATE_NOW,
  DESCRIPTION,
  ENTRIES,
  ITEM_TYPE,
  META,
  NAME,
  NAMESPACE_TYPE,
  TIE_BREAKER,
  USER,
} from '../../constants.mock';

import { ExceptionListItemSchema } from './exception_list_item_schema';

export const getExceptionListItemSchemaMock = (): ExceptionListItemSchema => ({
  _tags: ['endpoint', 'process', 'malware', 'os:linux'],
  _version: undefined,
  comments: COMMENTS,
  created_at: DATE_NOW,
  created_by: USER,
  description: DESCRIPTION,
  entries: ENTRIES,
  id: '1',
  item_id: 'endpoint_list_item',
  list_id: 'endpoint_list_id',
  meta: META,
  name: NAME,
  namespace_type: NAMESPACE_TYPE,
  tags: ['user added string for a tag', 'malware'],
  tie_breaker_id: TIE_BREAKER,
  type: ITEM_TYPE,
  updated_at: DATE_NOW,
  updated_by: USER,
});
