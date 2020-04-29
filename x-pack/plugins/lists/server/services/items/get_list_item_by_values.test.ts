/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LIST_ID, LIST_ITEM_INDEX, TYPE, VALUE, VALUE_2, getDataClientMock } from '../mocks';
import { getSearchListItemMock } from '../mocks/get_search_list_item_mock';

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
    const dataClient = getDataClientMock(data);
    const listItem = await getListItemByValues({
      dataClient,
      listId: LIST_ID,
      listItemIndex: LIST_ITEM_INDEX,
      type: TYPE,
      value: [VALUE, VALUE_2],
    });
    expect(listItem).toEqual([]);
  });

  test('Returns transformed list item if the data exists within ES', async () => {
    const data = getSearchListItemMock();
    const dataClient = getDataClientMock(data);
    const listItem = await getListItemByValues({
      dataClient,
      listId: LIST_ID,
      listItemIndex: LIST_ITEM_INDEX,
      type: TYPE,
      value: [VALUE, VALUE_2],
    });
    expect(listItem).toEqual([
      {
        created_at: '2020-04-20T15:25:31.830Z',
        created_by: 'some user',
        id: 'some-list-item-id',
        list_id: 'some-list-id',
        meta: {},
        tie_breaker_id: '6a76b69d-80df-4ab2-8c3e-85f466b06a0e',
        type: 'ip',
        updated_at: '2020-04-20T15:25:31.830Z',
        updated_by: 'some user',
        value: '127.0.0.1',
      },
    ]);
  });
});
