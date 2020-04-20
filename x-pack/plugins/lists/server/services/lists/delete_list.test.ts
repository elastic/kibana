/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ListsSchema } from '../../../common/schemas';
import { getDeleteListInputMock } from '../__mocks__/get_delete_list_input_mock';
import { getListsResponseMock } from '../__mocks__/get_lists_reponse_mock';
import {
  LISTS_INDEX,
  LISTS_ITEMS_INDEX,
  LIST_ID,
} from '../__mocks__/lists_services_mock_constants';

import { getList } from './get_list';
import { deleteList } from './delete_list';

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
    const options = getDeleteListInputMock();
    const deletedList = await deleteList(options);
    expect(deletedList).toEqual(null);
  });

  test('Delete returns the list if a list is returned from getList', async () => {
    const list: ListsSchema = getListsResponseMock();
    ((getList as unknown) as jest.Mock).mockResolvedValueOnce(list);
    const options = getDeleteListInputMock();
    const deletedList = await deleteList(options);
    expect(deletedList).toEqual(list);
  });

  test('Delete calls "deleteByQuery" and "delete" if a list is returned from getList', async () => {
    const list: ListsSchema = getListsResponseMock();
    ((getList as unknown) as jest.Mock).mockResolvedValueOnce(list);
    const options = getDeleteListInputMock();
    await deleteList(options);
    const deleteByQuery = {
      body: { query: { term: { list_id: LIST_ID } } },
      index: LISTS_ITEMS_INDEX,
    };
    expect(options.dataClient.callAsCurrentUser).toBeCalledWith('deleteByQuery', deleteByQuery);
  });

  test('Delete calls "delete" second if a list is returned from getList', async () => {
    const list: ListsSchema = getListsResponseMock();
    ((getList as unknown) as jest.Mock).mockResolvedValueOnce(list);
    const options = getDeleteListInputMock();
    await deleteList(options);
    const deleteQuery = {
      id: LIST_ID,
      index: LISTS_INDEX,
    };
    expect(options.dataClient.callAsCurrentUser).toHaveBeenNthCalledWith(2, 'delete', deleteQuery);
  });

  test('Delete does not call data client if the list returns null', async () => {
    ((getList as unknown) as jest.Mock).mockResolvedValueOnce(null);
    const options = getDeleteListInputMock();
    await deleteList(options);
    expect(options.dataClient.callAsCurrentUser).not.toHaveBeenCalled();
  });
});
