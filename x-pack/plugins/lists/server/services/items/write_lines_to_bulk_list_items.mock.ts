/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { TestReadable } from '../../../common/test_readable.mock';
import { getCallClusterMock } from '../../../common/get_call_cluster.mock';
import { ImportListItemsToStreamOptions, WriteBufferToItemsOptions } from '../items';
import { LIST_ID, LIST_ITEM_INDEX, META, TYPE, USER } from '../../../common/constants.mock';

export const getImportListItemsToStreamOptionsMock = (): ImportListItemsToStreamOptions => ({
  callCluster: getCallClusterMock(),
  listId: LIST_ID,
  listItemIndex: LIST_ITEM_INDEX,
  meta: META,
  stream: new TestReadable(),
  type: TYPE,
  user: USER,
});

export const getWriteBufferToItemsOptionsMock = (): WriteBufferToItemsOptions => ({
  buffer: [],
  callCluster: getCallClusterMock(),
  listId: LIST_ID,
  listItemIndex: LIST_ITEM_INDEX,
  meta: META,
  type: TYPE,
  user: USER,
});
