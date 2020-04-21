/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ListItemSchema } from '../../../common/schemas';

import { DATE_NOW, LIST_ID, LIST_ITEM_ID, USER, VALUE } from './lists_services_mock_constants';

export const getListItemResponseMock = (): ListItemSchema => ({
  created_at: DATE_NOW,
  created_by: USER,
  id: LIST_ITEM_ID,
  list_id: LIST_ID,
  meta: {},
  tie_breaker_id: '6a76b69d-80df-4ab2-8c3e-85f466b06a0e',
  type: 'ip',
  updated_at: DATE_NOW,
  updated_by: USER,
  value: VALUE,
});
