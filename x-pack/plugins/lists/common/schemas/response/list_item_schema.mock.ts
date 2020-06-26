/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ListItemSchema } from '../../../common/schemas';
import {
  DATE_NOW,
  LIST_ID,
  LIST_ITEM_ID,
  META,
  TIE_BREAKER,
  TYPE,
  USER,
  VALUE,
} from '../../../common/constants.mock';

export const getListItemResponseMock = (): ListItemSchema => ({
  created_at: DATE_NOW,
  created_by: USER,
  deserializer: undefined,
  id: LIST_ITEM_ID,
  list_id: LIST_ID,
  meta: META,
  serializer: undefined,
  tie_breaker_id: TIE_BREAKER,
  type: TYPE,
  updated_at: DATE_NOW,
  updated_by: USER,
  value: VALUE,
});
