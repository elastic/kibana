/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';

import { SearchEsListSchema } from '../../../common/schemas';
import {
  DATE_NOW,
  DESCRIPTION,
  LIST_ID,
  LIST_INDEX,
  META,
  NAME,
  TIE_BREAKER,
  TYPE,
  USER,
} from '../../../common/constants.mock';
import { getShardMock } from '../../get_shard.mock';

export const getSearchEsListMock = (): SearchEsListSchema => ({
  created_at: DATE_NOW,
  created_by: USER,
  description: DESCRIPTION,
  deserializer: undefined,
  meta: META,
  name: NAME,
  serializer: undefined,
  tie_breaker_id: TIE_BREAKER,
  type: TYPE,
  updated_at: DATE_NOW,
  updated_by: USER,
});

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

export const getEmptySearchListMock = (): SearchResponse<SearchEsListSchema> => ({
  _scroll_id: '123',
  _shards: getShardMock(),
  hits: {
    hits: [],
    max_score: 0,
    total: 0,
  },
  timed_out: false,
  took: 10,
});
