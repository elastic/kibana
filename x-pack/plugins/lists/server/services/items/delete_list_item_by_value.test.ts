/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getListItemResponseMock } from '../../../common/schemas/response/list_item_schema.mock';

import { getListItemByValues } from './get_list_item_by_values';
import { deleteListItemByValue } from './delete_list_item_by_value';
import { getDeleteListItemByValueOptionsMock } from './delete_list_item_by_value.mock';

jest.mock('./get_list_item_by_values', () => ({
  getListItemByValues: jest.fn(),
}));

describe('delete_list_item_by_value', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('Delete returns a an empty array if the list items are also empty', async () => {
    ((getListItemByValues as unknown) as jest.Mock).mockResolvedValueOnce([]);
    const options = getDeleteListItemByValueOptionsMock();
    const deletedListItem = await deleteListItemByValue(options);
    expect(deletedListItem).toEqual([]);
  });

  test('Delete returns the list item if a list item is returned from "getListByValues"', async () => {
    const listItems = [getListItemResponseMock()];
    ((getListItemByValues as unknown) as jest.Mock).mockResolvedValueOnce(listItems);
    const options = getDeleteListItemByValueOptionsMock();
    const deletedListItem = await deleteListItemByValue(options);
    expect(deletedListItem).toEqual(listItems);
  });

  test('Delete calls "deleteByQuery" if a list item is returned from "getListByValues"', async () => {
    const listItems = [getListItemResponseMock()];
    ((getListItemByValues as unknown) as jest.Mock).mockResolvedValueOnce(listItems);
    const options = getDeleteListItemByValueOptionsMock();
    await deleteListItemByValue(options);
    const deleteByQuery = {
      body: {
        query: {
          bool: {
            filter: [{ term: { list_id: 'some-list-id' } }, { terms: { ip: ['127.0.0.1'] } }],
          },
        },
      },
      index: '.items',
    };
    expect(options.callCluster).toBeCalledWith('deleteByQuery', deleteByQuery);
  });
});
