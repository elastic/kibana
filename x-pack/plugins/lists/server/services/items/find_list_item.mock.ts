/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from 'elasticsearch';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from 'src/core/server/elasticsearch/client/mocks';

import { getShardMock } from '../../../common/get_shard.mock';
import { LIST_ID, LIST_INDEX, LIST_ITEM_INDEX } from '../../../common/constants.mock';

import { FindListItemOptions } from './find_list_item';

export const getFindCount = (): ReturnType<Client['count']> => {
  return Promise.resolve({
    _shards: getShardMock(),
    count: 1,
  });
};

export const getFindListItemOptionsMock = (): FindListItemOptions => {
  return {
    currentIndexPosition: 0,
    esClient: elasticsearchClientMock.createScopedClusterClient().asCurrentUser,
    filter: '',
    listId: LIST_ID,
    listIndex: LIST_INDEX,
    listItemIndex: LIST_ITEM_INDEX,
    page: 1,
    perPage: 25,
    searchAfter: undefined,
    sortField: undefined,
    sortOrder: undefined,
  };
};
