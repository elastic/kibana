/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getListResponseMock } from '../../../common/schemas/response/list_schema.mock';
import { LIST_ID, LIST_INDEX, LIST_ITEM_INDEX } from '../../../common/constants.mock';

import { getList } from './get_list';
import { deleteList } from './delete_list';
import { getDeleteListOptionsMock } from './delete_list.mock';

jest.mock('./get_list', () => ({
  getList: jest.fn(),
}));

describe('delete_list', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('It calls esClient with internal origin header to suppress deprecation logs for users from system generated queries', async () => {
    const list = getListResponseMock();
    (getList as unknown as jest.Mock).mockResolvedValueOnce(list);
    const options = getDeleteListOptionsMock();
    await deleteList(options);
    expect(options.esClient.deleteByQuery).toHaveBeenCalledWith({
      headers: { 'x-elastic-product-origin': 'security' },
      index: '.items',
      query: { term: { list_id: 'some-list-id' } },
      refresh: false,
    });
  });

  test('Delete returns a null if the list is also null', async () => {
    (getList as unknown as jest.Mock).mockResolvedValueOnce(null);
    const options = getDeleteListOptionsMock();
    const deletedList = await deleteList(options);
    expect(deletedList).toEqual(null);
  });

  test('Delete returns the list if a list is returned from getList', async () => {
    const list = getListResponseMock();
    (getList as unknown as jest.Mock).mockResolvedValueOnce(list);
    const options = getDeleteListOptionsMock();
    const deletedList = await deleteList(options);
    expect(deletedList).toEqual(list);
  });

  test('Delete calls "deleteByQuery" and "delete" if a list is returned from getList', async () => {
    const list = getListResponseMock();
    (getList as unknown as jest.Mock).mockResolvedValueOnce(list);
    const options = getDeleteListOptionsMock();
    await deleteList(options);
    const deleteByQuery = {
      headers: { 'x-elastic-product-origin': 'security' },
      index: LIST_ITEM_INDEX,
      query: { term: { list_id: LIST_ID } },
      refresh: false,
    };
    expect(options.esClient.deleteByQuery).toBeCalledWith(deleteByQuery);
  });

  test('Delete calls "delete" second if a list is returned from getList', async () => {
    const list = getListResponseMock();
    (getList as unknown as jest.Mock).mockResolvedValueOnce(list);
    const options = getDeleteListOptionsMock();
    await deleteList(options);
    const deleteQuery = {
      headers: { 'x-elastic-product-origin': 'security' },
      id: LIST_ID,
      index: LIST_INDEX,
      refresh: 'wait_for',
    };
    expect(options.esClient.delete).toHaveBeenNthCalledWith(1, deleteQuery);
  });

  test('Delete does not call data client if the list returns null', async () => {
    (getList as unknown as jest.Mock).mockResolvedValueOnce(null);
    const options = getDeleteListOptionsMock();
    await deleteList(options);
    expect(options.esClient.delete).not.toHaveBeenCalled();
  });
});
