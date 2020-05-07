/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CreateListItemOptions } from '../items';

import { getCallClusterMock } from './get_call_cluster_mock';
import {
  DATE_NOW,
  LIST_ID,
  LIST_ITEM_ID,
  LIST_ITEM_INDEX,
  META,
  TIE_BREAKER,
  TYPE,
  USER,
} from './lists_services_mock_constants';

export const getCreateListItemOptionsMock = (): CreateListItemOptions => ({
  callCluster: getCallClusterMock(),
  dateNow: DATE_NOW,
  id: LIST_ITEM_ID,
  listId: LIST_ID,
  listItemIndex: LIST_ITEM_INDEX,
  meta: META,
  tieBreaker: TIE_BREAKER,
  type: TYPE,
  user: USER,
  value: '127.0.0.1',
});
