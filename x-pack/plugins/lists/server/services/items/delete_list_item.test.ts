/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getListItemResponseMock } from '../../../common/schemas/response/list_item_schema.mock';
import { LIST_ITEM_ID, LIST_ITEM_INDEX } from '../../../common/constants.mock';

import { getListItem } from './get_list_item';
import { deleteListItem } from './delete_list_item';
import { getDeleteListItemOptionsMock } from './delete_list_item.mock';

jest.mock('./get_list_item', () => ({
  getListItem: jest.fn(),
}));

describe('delete_list_item', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('It calls esClient with internal origin header to suppress deprecation logs for users from system generated queries', async () => {
    const listItem = getListItemResponseMock();
    (getListItem as unknown as jest.Mock).mockResolvedValueOnce(listItem);
    const options = getDeleteListItemOptionsMock();
    await deleteListItem(options);

    expect(options.esClient.delete).toBeCalledWith(
      {
        id: 'some-list-item-id',
        index: '.items',
        refresh: 'wait_for',
      },
      { headers: { 'x-elastic-product-origin': 'security' } }
    );
  });

  test('Delete returns a null if "getListItem" returns a null', async () => {
    (getListItem as unknown as jest.Mock).mockResolvedValueOnce(null);
    const options = getDeleteListItemOptionsMock();
    const deletedListItem = await deleteListItem(options);
    expect(deletedListItem).toEqual(null);
  });

  test('Delete returns the same list item if a list item is returned from "getListItem"', async () => {
    const listItem = getListItemResponseMock();
    (getListItem as unknown as jest.Mock).mockResolvedValueOnce(listItem);
    const options = getDeleteListItemOptionsMock();
    const deletedListItem = await deleteListItem(options);
    expect(deletedListItem).toEqual(listItem);
  });

  test('Delete calls "delete" if a list item is returned from "getListItem"', async () => {
    const listItem = getListItemResponseMock();
    (getListItem as unknown as jest.Mock).mockResolvedValueOnce(listItem);
    const options = getDeleteListItemOptionsMock();
    await deleteListItem(options);
    const deleteQuery = {
      id: LIST_ITEM_ID,
      index: LIST_ITEM_INDEX,
      refresh: 'wait_for',
    };
    expect(options.esClient.delete).toBeCalledWith(deleteQuery, {
      headers: {
        'x-elastic-product-origin': 'security',
      },
    });
  });
});
