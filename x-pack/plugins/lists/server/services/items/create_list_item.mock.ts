/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from '@kbn/core/server/elasticsearch/client/mocks';

import {
  DATE_NOW,
  LIST_ID,
  LIST_ITEM_ID,
  LIST_ITEM_INDEX,
  META,
  TIE_BREAKER,
  TYPE,
  USER,
} from '../../../common/constants.mock';

import { CreateListItemOptions } from '.';

export const getCreateListItemOptionsMock = (): CreateListItemOptions => ({
  dateNow: DATE_NOW,
  deserializer: undefined,
  esClient: elasticsearchClientMock.createScopedClusterClient().asCurrentUser,
  id: LIST_ITEM_ID,
  listId: LIST_ID,
  listItemIndex: LIST_ITEM_INDEX,
  meta: META,
  serializer: undefined,
  tieBreaker: TIE_BREAKER,
  type: TYPE,
  user: USER,
  value: '127.0.0.1',
});
