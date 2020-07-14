/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';

import { SearchEsListItemSchema } from '../../../common/schemas';
import {
  DATE_NOW,
  LIST_ID,
  LIST_INDEX,
  LIST_ITEM_ID,
  META,
  TIE_BREAKER,
  USER,
  VALUE,
} from '../../../common/constants.mock';
import { getShardMock } from '../../get_shard.mock';

export const getSearchEsListItemsAsAllUndefinedMock = (): SearchEsListItemSchema => ({
  binary: undefined,
  boolean: undefined,
  byte: undefined,
  created_at: DATE_NOW,
  created_by: USER,
  date: undefined,
  date_nanos: undefined,
  date_range: undefined,
  deserializer: undefined,
  double: undefined,
  double_range: undefined,
  float: undefined,
  float_range: undefined,
  geo_point: undefined,
  geo_shape: undefined,
  half_float: undefined,
  integer: undefined,
  integer_range: undefined,
  ip: undefined,
  ip_range: undefined,
  keyword: undefined,
  list_id: LIST_ID,
  long: undefined,
  long_range: undefined,
  meta: META,
  serializer: undefined,
  shape: undefined,
  short: undefined,
  text: undefined,
  tie_breaker_id: TIE_BREAKER,
  updated_at: DATE_NOW,
  updated_by: USER,
});

export const getSearchEsListItemMock = (): SearchEsListItemSchema => ({
  ...getSearchEsListItemsAsAllUndefinedMock(),
  ip: VALUE,
});

export const getSearchListItemMock = (): SearchResponse<SearchEsListItemSchema> => ({
  _scroll_id: '123',
  _shards: getShardMock(),
  hits: {
    hits: [
      {
        _id: LIST_ITEM_ID,
        _index: LIST_INDEX,
        _score: 0,
        _source: getSearchEsListItemMock(),
        _type: '',
      },
    ],
    max_score: 0,
    total: 1,
  },
  timed_out: false,
  took: 10,
});
