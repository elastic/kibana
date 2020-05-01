/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { WriteBufferToItemsOptions } from '../items';

import { getCallClusterMock } from './get_call_cluster_mock';
import { LIST_ID, LIST_ITEM_INDEX, META, TYPE, USER } from './lists_services_mock_constants';

export const getWriteBufferToItemsOptionsMock = (): WriteBufferToItemsOptions => ({
  buffer: [],
  callCluster: getCallClusterMock(),
  listId: LIST_ID,
  listItemIndex: LIST_ITEM_INDEX,
  meta: META,
  type: TYPE,
  user: USER,
});
