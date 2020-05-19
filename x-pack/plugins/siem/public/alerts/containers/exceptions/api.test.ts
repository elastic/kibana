/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaServices } from '../../../common/lib/kibana';
import {
  addExceptionList,
  addExceptionListItem,
  fetchExceptionListById,
  fetchExceptionListItemsByListId,
  fetchExceptionListItemById,
  deleteExceptionListById,
  deleteExceptionListItemById,
} from './api';
import {
  mockExceptionItem,
  mockNewExceptionItem,
  mockExceptionList,
  mockNewExceptionList,
} from './mock';

const abortCtrl = new AbortController();
const mockKibanaServices = KibanaServices.get as jest.Mock;
jest.mock('../../../common/lib/kibana');

const fetchMock = jest.fn();
mockKibanaServices.mockReturnValue({ http: { fetch: fetchMock } });

describe('Exceptions Lists API', () => {
  describe('addExceptionList', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(mockExceptionList);
    });

    test('check parameter url, body', async () => {
      await addExceptionList({ list: mockNewExceptionList, signal: abortCtrl.signal });
      expect(fetchMock).toHaveBeenCalledWith('/api/exception_lists', {
        body:
          '{"list_id":"endpoint_list","_tags":["endpoint","process","malware","os:linux"],"tags":["user added string for a tag","malware"],"type":"endpoint","description":"This is a sample endpoint type exception","name":"Sample Endpoint Exception List"}',
        method: 'POST',
        signal: abortCtrl.signal,
      });
    });

    test('check parameter url, body when "list.id" exists', async () => {
      await addExceptionList({ list: mockExceptionList, signal: abortCtrl.signal });
      expect(fetchMock).toHaveBeenCalledWith('/api/exception_lists', {
        body:
          '{"id":"1","list_id":"endpoint_list","_tags":["endpoint","process","malware","os:linux"],"tags":["user added string for a tag","malware"],"type":"endpoint","description":"This is a sample endpoint type exception","name":"Sample Endpoint Exception List","created_at":"2020-04-23T00:19:13.289Z","created_by":"user_name","tie_breaker_id":"77fd1909-6786-428a-a671-30229a719c1f","updated_at":"2020-04-23T00:19:13.289Z","updated_by":"user_name","meta":{}}',
        method: 'PUT',
        signal: abortCtrl.signal,
      });
    });

    test('happy path', async () => {
      const exceptionResponse = await addExceptionList({
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
      await addExceptionListItem({ listItem: mockNewExceptionItem, signal: abortCtrl.signal });
      expect(fetchMock).toHaveBeenCalledWith('/api/exception_lists/items', {
        body:
          '{"list_id":"endpoint_list","item_id":"endpoint_list_item","_tags":["endpoint","process","malware","os:linux"],"tags":["user added string for a tag","malware"],"type":"simple","description":"This is a sample endpoint type exception","name":"Sample Endpoint Exception List","entries":[{"field":"actingProcess.file.signer","operator":"included","match":"Elastic, N.V."},{"field":"event.category","operator":"included","match_any":["process","malware"]}]}',
        method: 'POST',
        signal: abortCtrl.signal,
      });
    });

    test('check parameter url, body when "listItem.id" exists', async () => {
      await addExceptionListItem({ listItem: mockExceptionItem, signal: abortCtrl.signal });
      expect(fetchMock).toHaveBeenCalledWith('/api/exception_lists/items', {
        body:
          '{"id":"1","created_at":"2020-04-23T00:19:13.289Z","created_by":"user_name","tie_breaker_id":"77fd1909-6786-428a-a671-30229a719c1f","updated_at":"2020-04-23T00:19:13.289Z","updated_by":"user_name","list_id":"endpoint_list","item_id":"endpoint_list_item","comment":[],"meta":{},"_tags":["endpoint","process","malware","os:linux"],"tags":["user added string for a tag","malware"],"type":"simple","description":"This is a sample endpoint type exception","name":"Sample Endpoint Exception List","entries":[{"field":"actingProcess.file.signer","operator":"included","match":"Elastic, N.V."},{"field":"event.category","operator":"included","match_any":["process","malware"]}]}',
        method: 'PUT',
        signal: abortCtrl.signal,
      });
    });

    test('happy path', async () => {
      const exceptionResponse = await addExceptionListItem({
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
      await fetchExceptionListById({ id: '1', signal: abortCtrl.signal });
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

    test('check parameter url, body', async () => {
      await fetchExceptionListItemsByListId({ listId: 'endpoint_list', signal: abortCtrl.signal });
      expect(fetchMock).toHaveBeenCalledWith('/api/exception_lists/items/_find', {
        method: 'GET',
        query: {
          list_id: 'endpoint_list',
        },
        signal: abortCtrl.signal,
      });
    });

    test('happy path', async () => {
      const exceptionResponse = await fetchExceptionListItemsByListId({
        listId: 'endpoint_list',
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
      await fetchExceptionListItemById({ id: '1', signal: abortCtrl.signal });
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
      await deleteExceptionListById({ id: '1', signal: abortCtrl.signal });
      expect(fetchMock).toHaveBeenCalledWith('/api/exception_lists', {
        query: {
          id: '1',
        },
        method: 'DELETE',
        signal: abortCtrl.signal,
      });
    });

    test('happy path', async () => {
      const exceptionResponse = await deleteExceptionListById({
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
      await deleteExceptionListItemById({ id: '1', signal: abortCtrl.signal });
      expect(fetchMock).toHaveBeenCalledWith('/api/exception_lists/items', {
        query: {
          id: '1',
        },
        method: 'DELETE',
        signal: abortCtrl.signal,
      });
    });

    test('happy path', async () => {
      const exceptionResponse = await deleteExceptionListItemById({
        id: '1',
        signal: abortCtrl.signal,
      });
      expect(exceptionResponse).toEqual(mockExceptionItem);
    });
  });
});
