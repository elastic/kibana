/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getCallClusterMock } from '../../../common/get_call_cluster.mock';
import { CreateListItemsBulkOptions } from '../items';
import {
  DATE_NOW,
  LIST_ID,
  LIST_ITEM_INDEX,
  META,
  TIE_BREAKERS,
  TYPE,
  USER,
  VALUE,
  VALUE_2,
} from '../../../common/constants.mock';

export const getCreateListItemBulkOptionsMock = (): CreateListItemsBulkOptions => ({
  callCluster: getCallClusterMock(),
  dateNow: DATE_NOW,
  deserializer: undefined,
  listId: LIST_ID,
  listItemIndex: LIST_ITEM_INDEX,
  meta: META,
  serializer: undefined,
  tieBreaker: TIE_BREAKERS,
  type: TYPE,
  user: USER,
  value: [VALUE, VALUE_2],
});
