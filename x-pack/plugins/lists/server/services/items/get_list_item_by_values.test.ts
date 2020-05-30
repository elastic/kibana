/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getSearchListItemMock } from '../../../common/schemas/elastic_response/search_es_list_item_schema.mock';
import { getCallClusterMock } from '../../../common/get_call_cluster.mock';
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
    const callCluster = getCallClusterMock(data);
    const listItem = await getListItemByValues({
      callCluster,
      listId: LIST_ID,
      listItemIndex: LIST_ITEM_INDEX,
      type: TYPE,
      value: [VALUE, VALUE_2],
    });

    expect(listItem).toEqual([]);
  });

  test('Returns transformed list item if the data exists within ES', async () => {
    const data = getSearchListItemMock();
    const callCluster = getCallClusterMock(data);
    const listItem = await getListItemByValues({
      callCluster,
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
