/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndexEsListsItemsSchema, ListsItemsSchema } from '../../../common/schemas';
import {
  LISTS_ITEMS_INDEX,
  LIST_ITEM_ID,
  getCreateListItemOptionsMock,
  getIndexESListsItemsMock,
  getListItemResponseMock,
} from '../mocks';

import { createListItem } from './create_list_item';

describe('crete_list_item', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('it returns a list item as expected with the id changed out for the elastic id', async () => {
    const options = getCreateListItemOptionsMock();
    const listItem = await createListItem(options);
    const expected: ListsItemsSchema = getListItemResponseMock();
    expected.id = 'elastic-id-123';
    expect(listItem).toEqual(expected);
  });

  test('It calls "callAsCurrentUser" with body, index, and listsIndex', async () => {
    const options = getCreateListItemOptionsMock();
    await createListItem(options);
    const body: IndexEsListsItemsSchema = getIndexESListsItemsMock();
    const expected = {
      body,
      id: LIST_ITEM_ID,
      index: LISTS_ITEMS_INDEX,
    };
    expect(options.dataClient.callAsCurrentUser).toBeCalledWith('index', expected);
  });

  test('It returns an auto-generated id if id is sent in undefined', async () => {
    const options = getCreateListItemOptionsMock();
    options.id = undefined;
    const list = await createListItem(options);
    const expected: ListsItemsSchema = getListItemResponseMock();
    expected.id = 'elastic-id-123';
    expect(list).toEqual(expected);
  });
});
