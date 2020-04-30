/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';

import { SearchEsListSchema } from '../../../common/schemas';

import { getShardMock } from './get_shard_mock';
import { LIST_ID, LIST_INDEX } from './lists_services_mock_constants';
import { getSearchEsListMock } from './get_search_es_list_mock';

export const getSearchListMock = (): SearchResponse<SearchEsListSchema> => ({
  _scroll_id: '123',
  _shards: getShardMock(),
  hits: {
    hits: [
      {
        _id: LIST_ID,
        _index: LIST_INDEX,
        _score: 0,
        _source: getSearchEsListMock(),
        _type: '',
      },
    ],
    max_score: 0,
    total: 1,
  },
  timed_out: false,
  took: 10,
});
