/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { createKibanaCoreStartMock } from '../common/mocks/kibana_core';

import {
  mockExceptionItem,
  mockExceptionList,
  mockNewExceptionItem,
  mockNewExceptionList,
} from './mock';
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
  describe('addExceptionList', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(mockExceptionList);
    });

    test('check parameter url, body', async () => {
      await addExceptionList({
        http: mockKibanaHttpService(),
        list: mockNewExceptionList,
        signal: abortCtrl.signal,
      });
      expect(fetchMock).toHaveBeenCalledWith('/api/exception_lists', {
        body:
          '{"_tags":["endpoint","process","malware","os:linux"],"description":"This is a sample endpoint type exception","list_id":"endpoint_list","name":"Sample Endpoint Exception List","tags":["user added string for a tag","malware"],"type":"endpoint"}',
        method: 'POST',
        signal: abortCtrl.signal,
      });
    });

    test('check parameter url, body when "list.id" exists', async () => {
      await addExceptionList({
        http: mockKibanaHttpService(),
        list: mockExceptionList,
        signal: abortCtrl.signal,
      });
      expect(fetchMock).toHaveBeenCalledWith('/api/exception_lists', {
        body:
          '{"_tags":["endpoint","process","malware","os:linux"],"created_at":"2020-04-23T00:19:13.289Z","created_by":"user_name","description":"This is a sample endpoint type exception","id":"1","list_id":"endpoint_list","meta":{},"name":"Sample Endpoint Exception List","namespace_type":"single","tags":["user added string for a tag","malware"],"tie_breaker_id":"77fd1909-6786-428a-a671-30229a719c1f","type":"endpoint","updated_at":"2020-04-23T00:19:13.289Z","updated_by":"user_name"}',
        method: 'PUT',
        signal: abortCtrl.signal,
      });
    });

    test('happy path', async () => {
      const exceptionResponse = await addExceptionList({
        http: mockKibanaHttpService(),
        list: mockNewExceptionList,
        signal: abortCtrl.signal,
      });
      expect(exceptionResponse).toEqual(mockExceptionList);
    });
  });

  describe('addExceptionListItem', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(mockExceptionItem);
    });

    test('check parameter url, body', async () => {
      await addExceptionListItem({
        http: mockKibanaHttpService(),
        listItem: mockNewExceptionItem,
        signal: abortCtrl.signal,
      });
      expect(fetchMock).toHaveBeenCalledWith('/api/exception_lists/items', {
        body:
          '{"_tags":["endpoint","process","malware","os:linux"],"description":"This is a sample endpoint type exception","entries":[{"field":"actingProcess.file.signer","match":"Elastic, N.V.","operator":"included"},{"field":"event.category","match_any":["process","malware"],"operator":"included"}],"item_id":"endpoint_list_item","list_id":"endpoint_list","name":"Sample Endpoint Exception List","tags":["user added string for a tag","malware"],"type":"simple"}',
        method: 'POST',
        signal: abortCtrl.signal,
      });
    });

    test('check parameter url, body when "listItem.id" exists', async () => {
      await addExceptionListItem({
        http: mockKibanaHttpService(),
        listItem: mockExceptionItem,
        signal: abortCtrl.signal,
      });
      expect(fetchMock).toHaveBeenCalledWith('/api/exception_lists/items', {
        body:
          '{"_tags":["endpoint","process","malware","os:linux"],"comment":[],"created_at":"2020-04-23T00:19:13.289Z","created_by":"user_name","description":"This is a sample endpoint type exception","entries":[{"field":"actingProcess.file.signer","match":"Elastic, N.V.","operator":"included"},{"field":"event.category","match_any":["process","malware"],"operator":"included"}],"id":"1","item_id":"endpoint_list_item","list_id":"endpoint_list","meta":{},"name":"Sample Endpoint Exception List","namespace_type":"single","tags":["user added string for a tag","malware"],"tie_breaker_id":"77fd1909-6786-428a-a671-30229a719c1f","type":"simple","updated_at":"2020-04-23T00:19:13.289Z","updated_by":"user_name"}',
        method: 'PUT',
        signal: abortCtrl.signal,
      });
    });

    test('happy path', async () => {
      const exceptionResponse = await addExceptionListItem({
        http: mockKibanaHttpService(),
        listItem: mockNewExceptionItem,
        signal: abortCtrl.signal,
      });
      expect(exceptionResponse).toEqual(mockExceptionItem);
    });
  });

  describe('fetchExceptionListById', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(mockExceptionList);
    });

    test('check parameter url, body', async () => {
      await fetchExceptionListById({
        http: mockKibanaHttpService(),
        id: '1',
        signal: abortCtrl.signal,
      });
      expect(fetchMock).toHaveBeenCalledWith('/api/exception_lists', {
        method: 'GET',
        query: {
          id: '1',
        },
        signal: abortCtrl.signal,
      });
    });

    test('happy path', async () => {
      const exceptionResponse = await fetchExceptionListById({
        http: mockKibanaHttpService(),
        id: '1',
        signal: abortCtrl.signal,
      });
      expect(exceptionResponse).toEqual(mockExceptionList);
    });
  });

  describe('fetchExceptionListItemsByListId', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue([mockNewExceptionItem]);
    });

    test('check parameter url, query without any filter or perPage options', async () => {
      await fetchExceptionListItemsByListId({
        http: mockKibanaHttpService(),
        listId: 'myList',
        signal: abortCtrl.signal,
      });
      expect(fetchMock).toHaveBeenCalledWith('/api/exception_lists/items/_find', {
        method: 'GET',
        query: {
          listId: 'myList',
          namespaceType: 'single',
          page: 1,
          per_page: 20,
          sort_field: 'enabled',
          sort_order: 'desc',
        },
        signal: abortCtrl.signal,
      });
    });

    test('check parameter url, query with a filter', async () => {
      await fetchExceptionListItemsByListId({
        filterOptions: {
          filter: 'hello world',
          sortField: 'enabled',
          sortOrder: 'desc',
          tags: ['malware'],
        },
        http: mockKibanaHttpService(),
        listId: 'myList',
        signal: abortCtrl.signal,
      });

      expect(fetchMock).toHaveBeenCalledWith('/api/exception_lists/items/_find', {
        method: 'GET',
        query: {
          filter:
            'exception-list.attributes.entries.field: hello world AND exception-list.attributes.tags: malware',
          listId: 'myList',
          namespaceType: 'single',
          page: 1,
          per_page: 20,
          sort_field: 'enabled',
          sort_order: 'desc',
        },
        signal: abortCtrl.signal,
      });
    });

    test('happy path', async () => {
      const exceptionResponse = await fetchExceptionListItemsByListId({
        filterOptions: {
          filter: '',
          sortField: 'enabled',
          sortOrder: 'desc',
          tags: [],
        },
        http: mockKibanaHttpService(),
        listId: 'endpoint_list',
        listType: 'siem',
        pagination: {
          page: 1,
          perPage: 20,
          total: 0,
        },
        signal: abortCtrl.signal,
      });
      expect(exceptionResponse).toEqual([mockNewExceptionItem]);
    });
  });

  describe('fetchExceptionListItemById', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue([mockNewExceptionItem]);
    });

    test('check parameter url, body', async () => {
      await fetchExceptionListItemById({
        http: mockKibanaHttpService(),
        id: '1',
        signal: abortCtrl.signal,
      });
      expect(fetchMock).toHaveBeenCalledWith('/api/exception_lists/items', {
        method: 'GET',
        query: {
          id: '1',
        },
        signal: abortCtrl.signal,
      });
    });

    test('happy path', async () => {
      const exceptionResponse = await fetchExceptionListItemById({
        http: mockKibanaHttpService(),
        id: '1',
        signal: abortCtrl.signal,
      });
      expect(exceptionResponse).toEqual([mockNewExceptionItem]);
    });
  });

  describe('deleteExceptionListById', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(mockExceptionList);
    });

    test('check parameter url, body when deleting exception item', async () => {
      await deleteExceptionListById({
        http: mockKibanaHttpService(),
        id: '1',
        signal: abortCtrl.signal,
      });
      expect(fetchMock).toHaveBeenCalledWith('/api/exception_lists', {
        method: 'DELETE',
        query: {
          id: '1',
        },
        signal: abortCtrl.signal,
      });
    });

    test('happy path', async () => {
      const exceptionResponse = await deleteExceptionListById({
        http: mockKibanaHttpService(),
        id: '1',
        signal: abortCtrl.signal,
      });
      expect(exceptionResponse).toEqual(mockExceptionList);
    });
  });

  describe('deleteExceptionListItemById', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(mockExceptionItem);
    });

    test('check parameter url, body when deleting exception item', async () => {
      await deleteExceptionListItemById({
        http: mockKibanaHttpService(),
        id: '1',
        signal: abortCtrl.signal,
      });
      expect(fetchMock).toHaveBeenCalledWith('/api/exception_lists/items', {
        method: 'DELETE',
        query: {
          id: '1',
        },
        signal: abortCtrl.signal,
      });
    });

    test('happy path', async () => {
      const exceptionResponse = await deleteExceptionListItemById({
        http: mockKibanaHttpService(),
        id: '1',
        signal: abortCtrl.signal,
      });
      expect(exceptionResponse).toEqual(mockExceptionItem);
    });
  });
});
