/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { UpdateListItemOptions } from '../items';

import { getCallClusterMock } from './get_call_cluster_mock';
import {
  DATE_NOW,
  LIST_ITEM_ID,
  LIST_ITEM_INDEX,
  META,
  USER,
  VALUE,
} from './lists_services_mock_constants';

export const getUpdateListItemOptionsMock = (): UpdateListItemOptions => ({
  callCluster: getCallClusterMock(),
  dateNow: DATE_NOW,
  id: LIST_ITEM_ID,
  listItemIndex: LIST_ITEM_INDEX,
  meta: META,
  user: USER,
  value: VALUE,
});
