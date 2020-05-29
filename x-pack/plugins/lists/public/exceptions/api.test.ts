/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { createKibanaCoreStartMock } from '../common/mocks/kibana_core';

import { mockExceptionItem, mockExceptionList } from './mock';
import {
  addExceptionList,
  addExceptionListItem,
  deleteExceptionListById,
  deleteExceptionListItemById,
  fetchExceptionListById,
  fetchExceptionListItemById,
  fetchExceptionListItemsByListId,
} from './api';

const abortCtrl = new AbortController();

jest.mock('../common/mocks/kibana_core', () => ({
  createKibanaCoreStartMock: (): jest.Mock => jest.fn(),
}));
const fetchMock = jest.fn();

/*
 This is a little funky, in order for typescript to not
 yell at us for converting 'Pick<CoreStart, "http">' to type 'Mock<any, any>'
 have to first convert to type 'unknown'
 */
const mockKibanaHttpService = ((createKibanaCoreStartMock() as unknown) as jest.Mock).mockReturnValue(
  {
    fetch: fetchMock,
  }
);

describe('Exceptions Lists API', () => {
  describe('#addExceptionList', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(mockExceptionList);
    });

    test('it uses POST when "list.id" does not exist', async () => {
      const payload = { ...mockExceptionList };
      delete payload.id;
      const exceptionResponse = await addExceptionList({
        http: mockKibanaHttpService(),
        list: payload,
        signal: abortCtrl.signal,
      });

      expect(fetchMock).toHaveBeenCalledWith('/api/exception_lists', {
        body: JSON.stringify(payload),
        method: 'POST',
        signal: abortCtrl.signal,
      });
      expect(exceptionResponse).toEqual({ id: '1', ...mockExceptionList });
    });

    test('it uses PUT when "list.id" exists', async () => {
      const payload = { ...mockExceptionList };
      const exceptionResponse = await addExceptionList({
        http: mockKibanaHttpService(),
        list: payload,
        signal: abortCtrl.signal,
      });

      expect(fetchMock).toHaveBeenCalledWith('/api/exception_lists', {
        body: JSON.stringify(payload),
        method: 'PUT',
        signal: abortCtrl.signal,
      });
      expect(exceptionResponse).toEqual(mockExceptionList);
    });
  });

  describe('#addExceptionListItem', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(mockExceptionItem);
    });

    test('it uses POST when "listItem.id" does not exist', async () => {
      const payload = { ...mockExceptionItem };
      delete payload.id;
      const exceptionResponse = await addExceptionListItem({
        http: mockKibanaHttpService(),
        listItem: payload,
        signal: abortCtrl.signal,
      });

      expect(fetchMock).toHaveBeenCalledWith('/api/exception_lists/items', {
        body: JSON.stringify(payload),
        method: 'POST',
        signal: abortCtrl.signal,
      });
      expect(exceptionResponse).toEqual(mockExceptionItem);
    });

    test('check parameter url, body when "listItem.id" exists', async () => {
      const payload = { ...mockExceptionItem };
      const exceptionResponse = await addExceptionListItem({
        http: mockKibanaHttpService(),
        listItem: payload,
        signal: abortCtrl.signal,
      });

      expect(fetchMock).toHaveBeenCalledWith('/api/exception_lists/items', {
        body: JSON.stringify(payload),
        method: 'PUT',
        signal: abortCtrl.signal,
      });
      expect(exceptionResponse).toEqual(mockExceptionItem);
    });
  });

  describe('#fetchExceptionListById', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(mockExceptionList);
    });

    test('it invokes "fetchExceptionListById" with expected url and body values', async () => {
      await fetchExceptionListById({
        http: mockKibanaHttpService(),
        id: '1',
        namespaceType: 'single',
        signal: abortCtrl.signal,
      });
      expect(fetchMock).toHaveBeenCalledWith('/api/exception_lists', {
        method: 'GET',
        query: {
          id: '1',
          namespace_type: 'single',
        },
        signal: abortCtrl.signal,
      });
    });

    test('it returns expected exception list on success', async () => {
      const exceptionResponse = await fetchExceptionListById({
        http: mockKibanaHttpService(),
        id: '1',
        namespaceType: 'single',
        signal: abortCtrl.signal,
      });

      expect(exceptionResponse).toEqual(mockExceptionList);
    });
  });

  describe('#fetchExceptionListItemsByListId', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue([mockExceptionItem]);
    });

    test('it invokes "fetchExceptionListItemsByListId" with expected url and body values', async () => {
      await fetchExceptionListItemsByListId({
        http: mockKibanaHttpService(),
        listId: 'myList',
        namespaceType: 'single',
        signal: abortCtrl.signal,
      });

      expect(fetchMock).toHaveBeenCalledWith('/api/exception_lists/items/_find', {
        method: 'GET',
        query: {
          list_id: 'myList',
          namespace_type: 'single',
          page: 1,
          per_page: 20,
        },
        signal: abortCtrl.signal,
      });
    });

    test('it invokes with expected url and body values when a filter exists and "namespaceType" of "single"', async () => {
      await fetchExceptionListItemsByListId({
        filterOptions: {
          filter: 'hello world',
          tags: [],
        },
        http: mockKibanaHttpService(),
        listId: 'myList',
        namespaceType: 'single',
        signal: abortCtrl.signal,
      });

      expect(fetchMock).toHaveBeenCalledWith('/api/exception_lists/items/_find', {
        method: 'GET',
        query: {
          filter: 'exception-list.attributes.entries.field:hello world*',
          list_id: 'myList',
          namespace_type: 'single',
          page: 1,
          per_page: 20,
        },
        signal: abortCtrl.signal,
      });
    });

    test('it invokes with expected url and body values when a filter exists and "namespaceType" of "agnostic"', async () => {
      await fetchExceptionListItemsByListId({
        filterOptions: {
          filter: 'hello world',
          tags: [],
        },
        http: mockKibanaHttpService(),
        listId: 'myList',
        namespaceType: 'agnostic',
        signal: abortCtrl.signal,
      });

      expect(fetchMock).toHaveBeenCalledWith('/api/exception_lists/items/_find', {
        method: 'GET',
        query: {
          filter: 'exception-list-agnostic.attributes.entries.field:hello world*',
          list_id: 'myList',
          namespace_type: 'agnostic',
          page: 1,
          per_page: 20,
        },
        signal: abortCtrl.signal,
      });
    });

    test('it invokes with expected url and body values when tags exists', async () => {
      await fetchExceptionListItemsByListId({
        filterOptions: {
          filter: '',
          tags: ['malware'],
        },
        http: mockKibanaHttpService(),
        listId: 'myList',
        namespaceType: 'agnostic',
        signal: abortCtrl.signal,
      });

      expect(fetchMock).toHaveBeenCalledWith('/api/exception_lists/items/_find', {
        method: 'GET',
        query: {
          filter: 'exception-list-agnostic.attributes.tags:malware',
          list_id: 'myList',
          namespace_type: 'agnostic',
          page: 1,
          per_page: 20,
        },
        signal: abortCtrl.signal,
      });
    });

    test('it invokes with expected url and body values when filter and tags exists', async () => {
      await fetchExceptionListItemsByListId({
        filterOptions: {
          filter: 'host.name',
          tags: ['malware'],
        },
        http: mockKibanaHttpService(),
        listId: 'myList',
        namespaceType: 'agnostic',
        signal: abortCtrl.signal,
      });

      expect(fetchMock).toHaveBeenCalledWith('/api/exception_lists/items/_find', {
        method: 'GET',
        query: {
          filter:
            'exception-list-agnostic.attributes.entries.field:host.name* AND exception-list-agnostic.attributes.tags:malware',
          list_id: 'myList',
          namespace_type: 'agnostic',
          page: 1,
          per_page: 20,
        },
        signal: abortCtrl.signal,
      });
    });

    test('it returns expected format when call succeeds', async () => {
      const exceptionResponse = await fetchExceptionListItemsByListId({
        http: mockKibanaHttpService(),
        listId: 'endpoint_list',
        namespaceType: 'single',
        signal: abortCtrl.signal,
      });
      expect(exceptionResponse).toEqual([{ ...mockExceptionItem }]);
    });
  });

  describe('#fetchExceptionListItemById', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue([mockExceptionItem]);
    });

    test('it invokes "fetchExceptionListItemById" with expected url and body values', async () => {
      await fetchExceptionListItemById({
        http: mockKibanaHttpService(),
        id: '1',
        namespaceType: 'single',
        signal: abortCtrl.signal,
      });
      expect(fetchMock).toHaveBeenCalledWith('/api/exception_lists/items', {
        method: 'GET',
        query: {
          id: '1',
          namespace_type: 'single',
        },
        signal: abortCtrl.signal,
      });
    });

    test('it returns expected format when call succeeds', async () => {
      const exceptionResponse = await fetchExceptionListItemById({
        http: mockKibanaHttpService(),
        id: '1',
        namespaceType: 'single',
        signal: abortCtrl.signal,
      });
      expect(exceptionResponse).toEqual([mockExceptionItem]);
    });
  });

  describe('#deleteExceptionListById', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(mockExceptionList);
    });

    test('check parameter url, body when deleting exception item', async () => {
      await deleteExceptionListById({
        http: mockKibanaHttpService(),
        id: '1',
        namespaceType: 'single',
        signal: abortCtrl.signal,
      });
      expect(fetchMock).toHaveBeenCalledWith('/api/exception_lists', {
        method: 'DELETE',
        query: {
          id: '1',
          namespace_type: 'single',
        },
        signal: abortCtrl.signal,
      });
    });

    test('it returns expected format when call succeeds', async () => {
      const exceptionResponse = await deleteExceptionListById({
        http: mockKibanaHttpService(),
        id: '1',
        namespaceType: 'single',
        signal: abortCtrl.signal,
      });
      expect(exceptionResponse).toEqual(mockExceptionList);
    });
  });

  describe('#deleteExceptionListItemById', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(mockExceptionItem);
    });

    test('check parameter url, body when deleting exception item', async () => {
      await deleteExceptionListItemById({
        http: mockKibanaHttpService(),
        id: '1',
        namespaceType: 'single',
        signal: abortCtrl.signal,
      });
      expect(fetchMock).toHaveBeenCalledWith('/api/exception_lists/items', {
        method: 'DELETE',
        query: {
          id: '1',
          namespace_type: 'single',
        },
        signal: abortCtrl.signal,
      });
    });

    test('it returns expected format when call succeeds', async () => {
      const exceptionResponse = await deleteExceptionListItemById({
        http: mockKibanaHttpService(),
        id: '1',
        namespaceType: 'single',
        signal: abortCtrl.signal,
      });
      expect(exceptionResponse).toEqual(mockExceptionItem);
    });
  });
});
