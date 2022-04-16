/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from '@kbn/core/server/elasticsearch/client/mocks';

import {
  LIST_ID,
  LIST_INDEX,
  LIST_ITEM_INDEX,
  META,
  TYPE,
  USER,
  VERSION,
} from '../../../common/constants.mock';
import { getConfigMockDecoded } from '../../config.mock';

import { TestReadable } from './test_readable.mock';

import { ImportListItemsToStreamOptions, WriteBufferToItemsOptions } from '.';

export const getImportListItemsToStreamOptionsMock = (): ImportListItemsToStreamOptions => ({
  config: getConfigMockDecoded(),
  deserializer: undefined,
  esClient: elasticsearchClientMock.createScopedClusterClient().asCurrentUser,
  listId: LIST_ID,
  listIndex: LIST_INDEX,
  listItemIndex: LIST_ITEM_INDEX,
  meta: META,
  serializer: undefined,
  stream: new TestReadable(),
  type: TYPE,
  user: USER,
  version: VERSION,
});

export const getWriteBufferToItemsOptionsMock = (): WriteBufferToItemsOptions => ({
  buffer: [],
  deserializer: undefined,
  esClient: elasticsearchClientMock.createScopedClusterClient().asCurrentUser,
  listId: LIST_ID,
  listItemIndex: LIST_ITEM_INDEX,
  meta: META,
  serializer: undefined,
  type: TYPE,
  user: USER,
});
