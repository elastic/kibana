/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LIST_ID, LIST_INDEX, getDataClientMock, getListItemResponseMock } from '../mocks';
import { getSearchListItemMock } from '../mocks/get_search_list_item_mock';

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
    const dataClient = getDataClientMock(data);
    const list = await getListItem({ dataClient, id: LIST_ID, listItemIndex: LIST_INDEX });
    const expected = getListItemResponseMock();
    expect(list).toEqual(expected);
  });

  test('it returns null if the search is empty', async () => {
    const data = getSearchListItemMock();
    data.hits.hits = [];
    const dataClient = getDataClientMock(data);
    const list = await getListItem({ dataClient, id: LIST_ID, listItemIndex: LIST_INDEX });
    expect(list).toEqual(null);
  });
});
