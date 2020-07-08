/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getListItemResponseMock } from '../../../common/schemas/response/list_item_schema.mock';
import { getIndexESListItemMock } from '../../../common/schemas/elastic_query/index_es_list_item_schema.mock';
import { LIST_ITEM_ID, LIST_ITEM_INDEX } from '../../../common/constants.mock';

import { CreateListItemOptions, createListItem } from './create_list_item';
import { getCreateListItemOptionsMock } from './create_list_item.mock';

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
    const expected = getListItemResponseMock();
    expected.id = 'elastic-id-123';
    expect(listItem).toEqual(expected);
  });

  test('It calls "callCluster" with body, index, and listIndex', async () => {
    const options = getCreateListItemOptionsMock();
    await createListItem(options);
    const body = getIndexESListItemMock();
    const expected = {
      body,
      id: LIST_ITEM_ID,
      index: LIST_ITEM_INDEX,
    };
    expect(options.callCluster).toBeCalledWith('index', expected);
  });

  test('It returns an auto-generated id if id is sent in undefined', async () => {
    const options = getCreateListItemOptionsMock();
    options.id = undefined;
    const list = await createListItem(options);
    const expected = getListItemResponseMock();
    expected.id = 'elastic-id-123';
    expect(list).toEqual(expected);
  });

  test('It returns null if an item does not match something such as an ip_range with an empty serializer', async () => {
    const options: CreateListItemOptions = {
      ...getCreateListItemOptionsMock(),
      serializer: '',
      type: 'ip_range',
      value: '# some comment',
    };
    const list = await createListItem(options);
    expect(list).toEqual(null);
  });
});
