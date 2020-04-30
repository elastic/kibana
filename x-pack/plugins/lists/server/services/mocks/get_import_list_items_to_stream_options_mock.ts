/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ImportListItemsToStreamOptions } from '../items';

import { getCallClusterMock } from './get_call_cluster_mock';
import { LIST_ID, LIST_ITEM_INDEX, META, TYPE, USER } from './lists_services_mock_constants';
import { TestReadable } from './test_readable';

export const getImportListItemsToStreamOptionsMock = (): ImportListItemsToStreamOptions => ({
  callCluster: getCallClusterMock(),
  listId: LIST_ID,
  listItemIndex: LIST_ITEM_INDEX,
  meta: META,
  stream: new TestReadable(),
  type: TYPE,
  user: USER,
});
