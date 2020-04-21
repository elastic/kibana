/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CreateListItemsBulkOptions } from '../items';

import { getDataClientMock } from './get_data_client_mock';
import {
  DATE_NOW,
  LISTS_ITEMS_INDEX,
  LIST_ID,
  META,
  TIE_BREAKERS,
  TYPE,
  USER,
  VALUE,
  VALUE_2,
} from './lists_services_mock_constants';

export const getCreateListItemBulkOptionsMock = (): CreateListItemsBulkOptions => ({
  dataClient: getDataClientMock(),
  dateNow: DATE_NOW,
  listId: LIST_ID,
  listsItemsIndex: LISTS_ITEMS_INDEX,
  meta: META,
  tieBreaker: TIE_BREAKERS,
  type: TYPE,
  user: USER,
  value: [VALUE, VALUE_2],
});
