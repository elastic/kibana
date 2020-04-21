/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CreateListItemOptions } from '../items';

import { getDataClientMock } from './get_data_client_mock';
import {
  DATE_NOW,
  LISTS_ITEMS_INDEX,
  LIST_ID,
  LIST_ITEM_ID,
  META,
  TIE_BREAKER,
  TYPE,
  USER,
} from './lists_services_mock_constants';

export const getCreateListItemOptionsMock = (): CreateListItemOptions => ({
  dataClient: getDataClientMock(),
  dateNow: DATE_NOW,
  id: LIST_ITEM_ID,
  listId: LIST_ID,
  listItemIndex: LISTS_ITEMS_INDEX,
  meta: META,
  tieBreaker: TIE_BREAKER,
  type: TYPE,
  user: USER,
  value: '127.0.0.1',
});
