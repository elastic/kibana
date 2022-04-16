/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from '@kbn/core/server/elasticsearch/client/mocks';

import { getListItemResponseMock } from '../../../common/schemas/response/list_item_schema.mock';
import {
  DATE_NOW,
  LIST_ID,
  LIST_INDEX,
  META,
  TIE_BREAKER,
  USER,
} from '../../../common/constants.mock';
import { getSearchListItemMock } from '../../schemas/elastic_response/search_es_list_item_schema.mock';

import { getListItem } from './get_list_item';

describe('get_list_item', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('it returns a list item as expected if the list item is found', async () => {
    const data = getSearchListItemMock();
    const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    esClient.search.mockResponse(data);
    const list = await getListItem({ esClient, id: LIST_ID, listItemIndex: LIST_INDEX });
    const expected = getListItemResponseMock();
    expect(list).toEqual(expected);
  });

  test('it returns null if the search is empty', async () => {
    const data = getSearchListItemMock();
    data.hits.hits = [];
    const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    esClient.search.mockResponse(data);
    const list = await getListItem({ esClient, id: LIST_ID, listItemIndex: LIST_INDEX });
    expect(list).toEqual(null);
  });

  test('it returns null if all the values underneath the source type is undefined', async () => {
    const data = getSearchListItemMock();
    data.hits.hits[0]._source = {
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
    };
    const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    esClient.search.mockResponse(data);
    const list = await getListItem({ esClient, id: LIST_ID, listItemIndex: LIST_INDEX });
    expect(list).toEqual(null);
  });
});
