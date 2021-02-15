/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCallClusterMock } from '../../../common/get_call_cluster.mock';
import { UpdateListItemOptions } from '../items';
import {
  DATE_NOW,
  LIST_ITEM_ID,
  LIST_ITEM_INDEX,
  META,
  USER,
  VALUE,
} from '../../../common/constants.mock';

export const getUpdateListItemOptionsMock = (): UpdateListItemOptions => ({
  _version: undefined,
  callCluster: getCallClusterMock(),
  dateNow: DATE_NOW,
  id: LIST_ITEM_ID,
  listItemIndex: LIST_ITEM_INDEX,
  meta: META,
  user: USER,
  value: VALUE,
});
