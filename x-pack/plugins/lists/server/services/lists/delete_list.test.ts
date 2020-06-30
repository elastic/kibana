/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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

  test('Delete returns a null if the list is also null', async () => {
    ((getList as unknown) as jest.Mock).mockResolvedValueOnce(null);
    const options = getDeleteListOptionsMock();
    const deletedList = await deleteList(options);
    expect(deletedList).toEqual(null);
  });

  test('Delete returns the list if a list is returned from getList', async () => {
    const list = getListResponseMock();
    ((getList as unknown) as jest.Mock).mockResolvedValueOnce(list);
    const options = getDeleteListOptionsMock();
    const deletedList = await deleteList(options);
    expect(deletedList).toEqual(list);
  });

  test('Delete calls "deleteByQuery" and "delete" if a list is returned from getList', async () => {
    const list = getListResponseMock();
    ((getList as unknown) as jest.Mock).mockResolvedValueOnce(list);
    const options = getDeleteListOptionsMock();
    await deleteList(options);
    const deleteByQuery = {
      body: { query: { term: { list_id: LIST_ID } } },
      index: LIST_ITEM_INDEX,
    };
    expect(options.callCluster).toBeCalledWith('deleteByQuery', deleteByQuery);
  });

  test('Delete calls "delete" second if a list is returned from getList', async () => {
    const list = getListResponseMock();
    ((getList as unknown) as jest.Mock).mockResolvedValueOnce(list);
    const options = getDeleteListOptionsMock();
    await deleteList(options);
    const deleteQuery = {
      id: LIST_ID,
      index: LIST_INDEX,
    };
    expect(options.callCluster).toHaveBeenNthCalledWith(2, 'delete', deleteQuery);
  });

  test('Delete does not call data client if the list returns null', async () => {
    ((getList as unknown) as jest.Mock).mockResolvedValueOnce(null);
    const options = getDeleteListOptionsMock();
    await deleteList(options);
    expect(options.callCluster).not.toHaveBeenCalled();
  });
});
