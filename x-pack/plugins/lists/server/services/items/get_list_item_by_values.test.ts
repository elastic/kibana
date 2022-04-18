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
  VALUE,
  VALUE_2,
} from '../../../common/constants.mock';
import { getSearchListItemMock } from '../../schemas/elastic_response/search_es_list_item_schema.mock';

import { getListItemByValues } from './get_list_item_by_values';

describe('get_list_item_by_values', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('Returns a an empty array if the ES query is also empty', async () => {
    const data = getSearchListItemMock();
    data.hits.hits = [];
    const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    esClient.search.mockResponse(data);
    const listItem = await getListItemByValues({
      esClient,
      listId: LIST_ID,
      listItemIndex: LIST_ITEM_INDEX,
      type: TYPE,
      value: [VALUE, VALUE_2],
    });

    expect(listItem).toEqual([]);
  });

  test('Returns transformed list item if the data exists within ES', async () => {
    const data = getSearchListItemMock();
    const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    esClient.search.mockResponse(data);
    const listItem = await getListItemByValues({
      esClient,
      listId: LIST_ID,
      listItemIndex: LIST_ITEM_INDEX,
      type: TYPE,
      value: [VALUE, VALUE_2],
    });

    expect(listItem).toEqual([
      {
        created_at: DATE_NOW,
        created_by: USER,
        id: LIST_ITEM_ID,
        list_id: LIST_ID,
        meta: META,
        tie_breaker_id: TIE_BREAKER,
        type: TYPE,
        updated_at: DATE_NOW,
        updated_by: USER,
        value: VALUE,
      },
    ]);
  });
});
