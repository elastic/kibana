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
  NAME,
  USER,
} from '../../../common/constants.mock';
import { getShardMock } from '../../get_shard.mock';

export const getSearchEsListMock = (): SearchEsListSchema => ({
  created_at: DATE_NOW,
  created_by: USER,
  description: DESCRIPTION,
  meta: {},
  name: NAME,
  tie_breaker_id: '6a76b69d-80df-4ab2-8c3e-85f466b06a0e',
  type: 'ip',
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
