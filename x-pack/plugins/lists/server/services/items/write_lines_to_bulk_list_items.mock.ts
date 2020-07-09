/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { getCallClusterMock } from '../../../common/get_call_cluster.mock';
import { ImportListItemsToStreamOptions, WriteBufferToItemsOptions } from '../items';
import {
  LIST_ID,
  LIST_INDEX,
  LIST_ITEM_INDEX,
  META,
  TYPE,
  USER,
} from '../../../common/constants.mock';
import { getConfigMockDecoded } from '../../config.mock';

import { TestReadable } from './test_readable.mock';

export const getImportListItemsToStreamOptionsMock = (): ImportListItemsToStreamOptions => ({
  callCluster: getCallClusterMock(),
  config: getConfigMockDecoded(),
  deserializer: undefined,
  listId: LIST_ID,
  listIndex: LIST_INDEX,
  listItemIndex: LIST_ITEM_INDEX,
  meta: META,
  serializer: undefined,
  stream: new TestReadable(),
  type: TYPE,
  user: USER,
});

export const getWriteBufferToItemsOptionsMock = (): WriteBufferToItemsOptions => ({
  buffer: [],
  callCluster: getCallClusterMock(),
  deserializer: undefined,
  listId: LIST_ID,
  listItemIndex: LIST_ITEM_INDEX,
  meta: META,
  serializer: undefined,
  type: TYPE,
  user: USER,
});
