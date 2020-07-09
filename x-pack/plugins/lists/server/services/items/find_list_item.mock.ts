/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Client } from 'elasticsearch';

import { getSearchListMock } from '../../../common/schemas/elastic_response/search_es_list_schema.mock';
import { getShardMock } from '../../../common/get_shard.mock';
import { getSearchListItemMock } from '../../../common/schemas/elastic_response/search_es_list_item_schema.mock';
import { getCallClusterMockMultiTimes } from '../../../common/get_call_cluster.mock';
import { LIST_ID, LIST_INDEX, LIST_ITEM_INDEX } from '../../../common/constants.mock';

import { FindListItemOptions } from './find_list_item';

export const getFindCount = (): ReturnType<Client['count']> => {
  return Promise.resolve({
    _shards: getShardMock(),
    count: 1,
  });
};

export const getFindListItemOptionsMock = (): FindListItemOptions => {
  const callCluster = getCallClusterMockMultiTimes([
    getSearchListMock(),
    getFindCount(),
    getSearchListItemMock(),
  ]);
  return {
    callCluster,
    currentIndexPosition: 0,
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
