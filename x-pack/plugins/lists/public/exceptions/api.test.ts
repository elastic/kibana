/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  addEndpointExceptionList,
  addExceptionList,
  addExceptionListItem,
  deleteExceptionListById,
  deleteExceptionListItemById,
  exportExceptionList,
  fetchExceptionListById,
  fetchExceptionListItemById,
  fetchExceptionLists,
  fetchExceptionListsItemsByListIds,
  updateExceptionList,
  updateExceptionListItem,
} from '@kbn/securitysolution-list-api';
import { coreMock } from '@kbn/core/public/mocks';

import { getExceptionListSchemaMock } from '../../common/schemas/response/exception_list_schema.mock';
import { getExceptionListItemSchemaMock } from '../../common/schemas/response/exception_list_item_schema.mock';
import { getCreateExceptionListSchemaMock } from '../../common/schemas/request/create_exception_list_schema.mock';
import { getCreateExceptionListItemSchemaMock } from '../../common/schemas/request/create_exception_list_item_schema.mock';
import { getFoundExceptionListItemSchemaMock } from '../../common/schemas/response/found_exception_list_item_schema.mock';
import { getUpdateExceptionListItemSchemaMock } from '../../common/schemas/request/update_exception_list_item_schema.mock';
import { getUpdateExceptionListSchemaMock } from '../../common/schemas/request/update_exception_list_schema.mock';
import { getFoundExceptionListSchemaMock } from '../../common/schemas/response/found_exception_list_schema.mock';

// TODO: These tests are left here until we move the mocks including the coreMock above into a location where we can consume them in a kbn package
// TODO: This really belongs as: kbn-securitysolution-list-api/src/api/index.test.ts as soon as we can.

const abortCtrl = new AbortController();

describe('Exceptions Lists API', () => {
  let httpMock: ReturnType<typeof coreMock.createStart>['http'];

  beforeEach(() => {
    httpMock = coreMock.createStart().http;
  });

  describe('#addExceptionList', () => {
    beforeEach(() => {
      httpMock.fetch.mockResolvedValue(getExceptionListSchemaMock());
    });

    test('it invokes "addExceptionList" with expected url and body values', async () => {
      const payload = getCreateExceptionListSchemaMock();
      await addExceptionList({
        http: httpMock,
        list: payload,
        signal: abortCtrl.signal,
      });
      // TODO Would like to just use getExceptionListSchemaMock() here, but
      // validation returns object in different order, making the strings not match
      expect(httpMock.fetch).toHaveBeenCalledWith('/api/exception_lists', {
        body: JSON.stringify(payload),
        method: 'POST',
        signal: abortCtrl.signal,
      });
    });

    test('it returns expected exception list on success', async () => {
      const payload = getCreateExceptionListSchemaMock();
      const exceptionResponse = await addExceptionList({
        http: httpMock,
        list: payload,
        signal: abortCtrl.signal,
      });
      expect(exceptionResponse).toEqual(getExceptionListSchemaMock());
    });

    test('it returns error if response payload fails decode', async () => {
      const payload = getCreateExceptionListSchemaMock();
      const badPayload = getExceptionListSchemaMock();
      // @ts-expect-error
      delete badPayload.id;
      httpMock.fetch.mockResolvedValue(badPayload);

      await expect(
        addExceptionList({
          http: httpMock,
          list: payload,
          signal: abortCtrl.signal,
        })
      ).rejects.toEqual(new Error('Invalid value "undefined" supplied to "id"'));
    });
  });

  describe('#addExceptionListItem', () => {
    beforeEach(() => {
      httpMock.fetch.mockResolvedValue(getExceptionListItemSchemaMock());
    });

    test('it invokes "addExceptionListItem" with expected url and body values', async () => {
      const payload = getCreateExceptionListItemSchemaMock();
      await addExceptionListItem({
        http: httpMock,
        listItem: payload,
        signal: abortCtrl.signal,
      });
      // TODO Would like to just use getExceptionListSchemaMock() here, but
      // validation returns object in different order, making the strings not match
      expect(httpMock.fetch).toHaveBeenCalledWith('/api/exception_lists/items', {
        body: JSON.stringify(payload),
        method: 'POST',
        signal: abortCtrl.signal,
      });
    });

    test('it returns expected exception list on success', async () => {
      const payload = getCreateExceptionListItemSchemaMock();
      const exceptionResponse = await addExceptionListItem({
        http: httpMock,
        listItem: payload,
        signal: abortCtrl.signal,
      });
      expect(exceptionResponse).toEqual(getExceptionListItemSchemaMock());
    });

    test('it returns error if response payload fails decode', async () => {
      const payload = getCreateExceptionListItemSchemaMock();
      const badPayload = getExceptionListItemSchemaMock();
      // @ts-expect-error
      delete badPayload.id;
      httpMock.fetch.mockResolvedValue(badPayload);

      await expect(
        addExceptionListItem({
          http: httpMock,
          listItem: payload,
          signal: abortCtrl.signal,
        })
      ).rejects.toEqual(new Error('Invalid value "undefined" supplied to "id"'));
    });
  });

  describe('#updateExceptionList', () => {
    beforeEach(() => {
      httpMock.fetch.mockResolvedValue(getExceptionListSchemaMock());
    });

    test('it invokes "updateExceptionList" with expected url and body values', async () => {
      const payload = getUpdateExceptionListSchemaMock();
      await updateExceptionList({
        http: httpMock,
        list: payload,
        signal: abortCtrl.signal,
      });
      // TODO Would like to just use getExceptionListSchemaMock() here, but
      // validation returns object in different order, making the strings not match
      expect(httpMock.fetch).toHaveBeenCalledWith('/api/exception_lists', {
        body: JSON.stringify(payload),
        method: 'PUT',
        signal: abortCtrl.signal,
      });
    });

    test('it returns expected exception list on success', async () => {
      const payload = getUpdateExceptionListSchemaMock();
      const exceptionResponse = await updateExceptionList({
        http: httpMock,
        list: payload,
        signal: abortCtrl.signal,
      });
      expect(exceptionResponse).toEqual(getExceptionListSchemaMock());
    });

    test('it returns error if response payload fails decode', async () => {
      const payload = getUpdateExceptionListSchemaMock();
      const badPayload = getExceptionListSchemaMock();
      // @ts-expect-error
      delete badPayload.id;
      httpMock.fetch.mockResolvedValue(badPayload);

      await expect(
        updateExceptionList({
          http: httpMock,
          list: payload,
          signal: abortCtrl.signal,
        })
      ).rejects.toEqual(new Error('Invalid value "undefined" supplied to "id"'));
    });
  });

  describe('#updateExceptionListItem', () => {
    beforeEach(() => {
      httpMock.fetch.mockResolvedValue(getExceptionListItemSchemaMock());
    });

    test('it invokes "updateExceptionListItem" with expected url and body values', async () => {
      const payload = getUpdateExceptionListItemSchemaMock();
      await updateExceptionListItem({
        http: httpMock,
        listItem: payload,
        signal: abortCtrl.signal,
      });
      // TODO Would like to just use getExceptionListSchemaMock() here, but
      // validation returns object in different order, making the strings not match
      expect(httpMock.fetch).toHaveBeenCalledWith('/api/exception_lists/items', {
        body: JSON.stringify(payload),
        method: 'PUT',
        signal: abortCtrl.signal,
      });
    });

    test('it returns expected exception list on success', async () => {
      const payload = getUpdateExceptionListItemSchemaMock();
      const exceptionResponse = await updateExceptionListItem({
        http: httpMock,
        listItem: payload,
        signal: abortCtrl.signal,
      });
      expect(exceptionResponse).toEqual(getExceptionListItemSchemaMock());
    });

    test('it returns error if response payload fails decode', async () => {
      const payload = getUpdateExceptionListItemSchemaMock();
      const badPayload = getExceptionListItemSchemaMock();
      // @ts-expect-error
      delete badPayload.id;
      httpMock.fetch.mockResolvedValue(badPayload);

      await expect(
        updateExceptionListItem({
          http: httpMock,
          listItem: payload,
          signal: abortCtrl.signal,
        })
      ).rejects.toEqual(new Error('Invalid value "undefined" supplied to "id"'));
    });
  });

  describe('#fetchExceptionLists', () => {
    beforeEach(() => {
      httpMock.fetch.mockResolvedValue(getFoundExceptionListSchemaMock());
    });

    test('it invokes "fetchExceptionLists" with expected url and body values', async () => {
      await fetchExceptionLists({
        filters: 'exception-list.attributes.name: Sample Endpoint',
        http: httpMock,
        namespaceTypes: 'single,agnostic',
        pagination: {
          page: 1,
          perPage: 20,
        },
        signal: abortCtrl.signal,
      });
      expect(httpMock.fetch).toHaveBeenCalledWith('/api/exception_lists/_find', {
        method: 'GET',
        query: {
          filter: 'exception-list.attributes.name: Sample Endpoint',
          namespace_type: 'single,agnostic',
          page: '1',
          per_page: '20',
          sort_field: 'exception-list.created_at',
          sort_order: 'desc',
        },
        signal: abortCtrl.signal,
      });
    });

    test('it returns expected exception list on success', async () => {
      const exceptionResponse = await fetchExceptionLists({
        filters: 'exception-list.attributes.name: Sample Endpoint',
        http: httpMock,
        namespaceTypes: 'single,agnostic',
        pagination: {
          page: 1,
          perPage: 20,
        },
        signal: abortCtrl.signal,
      });
      expect(exceptionResponse.data).toEqual([getExceptionListSchemaMock()]);
    });

    test('it returns expected exception lists when empty filter', async () => {
      const exceptionResponse = await fetchExceptionLists({
        filters: '',
        http: httpMock,
        namespaceTypes: 'single,agnostic',
        pagination: {
          page: 1,
          perPage: 20,
        },
        signal: abortCtrl.signal,
      });
      expect(httpMock.fetch).toHaveBeenCalledWith('/api/exception_lists/_find', {
        method: 'GET',
        query: {
          namespace_type: 'single,agnostic',
          page: '1',
          per_page: '20',
          sort_field: 'exception-list.created_at',
          sort_order: 'desc',
        },
        signal: abortCtrl.signal,
      });
      expect(exceptionResponse.data).toEqual([getExceptionListSchemaMock()]);
    });

    test('it returns error if response payload fails decode', async () => {
      const badPayload = getExceptionListSchemaMock();
      // @ts-expect-error
      delete badPayload.id;
      httpMock.fetch.mockResolvedValue({ data: [badPayload], page: 1, per_page: 20, total: 1 });

      await expect(
        fetchExceptionLists({
          filters: 'exception-list.attributes.name: Sample Endpoint',
          http: httpMock,
          namespaceTypes: 'single,agnostic',
          pagination: {
            page: 1,
            perPage: 20,
          },
          signal: abortCtrl.signal,
        })
      ).rejects.toEqual(new Error('Invalid value "undefined" supplied to "data,id"'));
    });
  });

  describe('#fetchExceptionListById', () => {
    beforeEach(() => {
      httpMock.fetch.mockResolvedValue(getExceptionListSchemaMock());
    });

    test('it invokes "fetchExceptionListById" with expected url and body values', async () => {
      await fetchExceptionListById({
        http: httpMock,
        id: '1',
        namespaceType: 'single',
        signal: abortCtrl.signal,
      });
      expect(httpMock.fetch).toHaveBeenCalledWith('/api/exception_lists', {
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
        http: httpMock,
        id: '1',
        namespaceType: 'single',
        signal: abortCtrl.signal,
      });
      expect(exceptionResponse).toEqual(getExceptionListSchemaMock());
    });

    test('it returns error if response payload fails decode', async () => {
      const badPayload = getExceptionListSchemaMock();
      // @ts-expect-error
      delete badPayload.id;
      httpMock.fetch.mockResolvedValue(badPayload);

      await expect(
        fetchExceptionListById({
          http: httpMock,
          id: '1',
          namespaceType: 'single',
          signal: abortCtrl.signal,
        })
      ).rejects.toEqual(new Error('Invalid value "undefined" supplied to "id"'));
    });
  });

  describe('#fetchExceptionListsItemsByListIds', () => {
    beforeEach(() => {
      httpMock.fetch.mockResolvedValue(getFoundExceptionListItemSchemaMock());
    });

    test('it invokes "fetchExceptionListsItemsByListIds" with expected url and body values', async () => {
      await fetchExceptionListsItemsByListIds({
        filterOptions: [],
        http: httpMock,
        listIds: ['myList', 'myOtherListId'],
        namespaceTypes: ['single', 'single'],
        pagination: {
          page: 1,
          perPage: 20,
        },
        signal: abortCtrl.signal,
      });

      expect(httpMock.fetch).toHaveBeenCalledWith('/api/exception_lists/items/_find', {
        method: 'GET',
        query: {
          list_id: 'myList,myOtherListId',
          namespace_type: 'single,single',
          page: '1',
          per_page: '20',
          sort_field: 'exception-list.created_at',
          sort_order: 'desc',
        },
        signal: abortCtrl.signal,
      });
    });

    test('it invokes with expected url and body values when a filter exists and "namespaceType" of "single"', async () => {
      await fetchExceptionListsItemsByListIds({
        filterOptions: [
          {
            filter: 'hello world',
            tags: [],
          },
        ],
        http: httpMock,
        listIds: ['myList'],
        namespaceTypes: ['single'],
        pagination: {
          page: 1,
          perPage: 20,
        },
        signal: abortCtrl.signal,
      });

      expect(httpMock.fetch).toHaveBeenCalledWith('/api/exception_lists/items/_find', {
        method: 'GET',
        query: {
          filter: 'exception-list.attributes.entries.field:hello world*',
          list_id: 'myList',
          namespace_type: 'single',
          page: '1',
          per_page: '20',
          sort_field: 'exception-list.created_at',
          sort_order: 'desc',
        },
        signal: abortCtrl.signal,
      });
    });

    test('it invokes with expected url and body values when a filter exists and "namespaceType" of "agnostic"', async () => {
      await fetchExceptionListsItemsByListIds({
        filterOptions: [
          {
            filter: 'hello world',
            tags: [],
          },
        ],
        http: httpMock,
        listIds: ['myList'],
        namespaceTypes: ['agnostic'],
        pagination: {
          page: 1,
          perPage: 20,
        },
        signal: abortCtrl.signal,
      });

      expect(httpMock.fetch).toHaveBeenCalledWith('/api/exception_lists/items/_find', {
        method: 'GET',
        query: {
          filter: 'exception-list-agnostic.attributes.entries.field:hello world*',
          list_id: 'myList',
          namespace_type: 'agnostic',
          page: '1',
          per_page: '20',
          sort_field: 'exception-list.created_at',
          sort_order: 'desc',
        },
        signal: abortCtrl.signal,
      });
    });

    test('it invokes with expected url and body values when tags exists', async () => {
      await fetchExceptionListsItemsByListIds({
        filterOptions: [
          {
            filter: '',
            tags: ['malware'],
          },
        ],
        http: httpMock,
        listIds: ['myList'],
        namespaceTypes: ['agnostic'],
        pagination: {
          page: 1,
          perPage: 20,
        },
        signal: abortCtrl.signal,
      });

      expect(httpMock.fetch).toHaveBeenCalledWith('/api/exception_lists/items/_find', {
        method: 'GET',
        query: {
          filter: 'exception-list-agnostic.attributes.tags:malware',
          list_id: 'myList',
          namespace_type: 'agnostic',
          page: '1',
          per_page: '20',
          sort_field: 'exception-list.created_at',
          sort_order: 'desc',
        },
        signal: abortCtrl.signal,
      });
    });

    test('it invokes with expected url and body values when filter and tags exists', async () => {
      await fetchExceptionListsItemsByListIds({
        filterOptions: [
          {
            filter: 'host.name',
            tags: ['malware'],
          },
        ],
        http: httpMock,
        listIds: ['myList'],
        namespaceTypes: ['agnostic'],
        pagination: {
          page: 1,
          perPage: 20,
        },
        signal: abortCtrl.signal,
      });

      expect(httpMock.fetch).toHaveBeenCalledWith('/api/exception_lists/items/_find', {
        method: 'GET',
        query: {
          filter:
            'exception-list-agnostic.attributes.entries.field:host.name* AND exception-list-agnostic.attributes.tags:malware',
          list_id: 'myList',
          namespace_type: 'agnostic',
          page: '1',
          per_page: '20',
          sort_field: 'exception-list.created_at',
          sort_order: 'desc',
        },
        signal: abortCtrl.signal,
      });
    });

    test('it returns expected format when call succeeds', async () => {
      const exceptionResponse = await fetchExceptionListsItemsByListIds({
        filterOptions: [],
        http: httpMock,
        listIds: ['endpoint_list_id'],
        namespaceTypes: ['single'],
        pagination: {
          page: 1,
          perPage: 20,
        },
        signal: abortCtrl.signal,
      });
      expect(exceptionResponse).toEqual(getFoundExceptionListItemSchemaMock());
    });

    test('it returns error if response payload fails decode', async () => {
      const badPayload = getExceptionListItemSchemaMock();
      // @ts-expect-error
      delete badPayload.id;
      httpMock.fetch.mockResolvedValue(badPayload);

      await expect(
        fetchExceptionListsItemsByListIds({
          filterOptions: [],
          http: httpMock,
          listIds: ['myList'],
          namespaceTypes: ['single'],
          pagination: {
            page: 1,
            perPage: 20,
          },
          signal: abortCtrl.signal,
        })
      ).rejects.toEqual(
        new Error(
          'Invalid value "undefined" supplied to "data",Invalid value "undefined" supplied to "page",Invalid value "undefined" supplied to "per_page",Invalid value "undefined" supplied to "total"'
        )
      );
    });
  });

  describe('#fetchExceptionListItemById', () => {
    beforeEach(() => {
      httpMock.fetch.mockResolvedValue(getExceptionListItemSchemaMock());
    });

    test('it invokes "fetchExceptionListItemById" with expected url and body values', async () => {
      await fetchExceptionListItemById({
        http: httpMock,
        id: '1',
        namespaceType: 'single',
        signal: abortCtrl.signal,
      });
      expect(httpMock.fetch).toHaveBeenCalledWith('/api/exception_lists/items', {
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
        http: httpMock,
        id: '1',
        namespaceType: 'single',
        signal: abortCtrl.signal,
      });
      expect(exceptionResponse).toEqual(getExceptionListItemSchemaMock());
    });

    test('it returns error if response payload fails decode', async () => {
      const badPayload = getExceptionListItemSchemaMock();
      // @ts-expect-error
      delete badPayload.id;
      httpMock.fetch.mockResolvedValue(badPayload);

      await expect(
        fetchExceptionListItemById({
          http: httpMock,
          id: '1',
          namespaceType: 'single',
          signal: abortCtrl.signal,
        })
      ).rejects.toEqual(new Error('Invalid value "undefined" supplied to "id"'));
    });
  });

  describe('#deleteExceptionListById', () => {
    beforeEach(() => {
      httpMock.fetch.mockResolvedValue(getExceptionListSchemaMock());
    });

    test('check parameter url, body when deleting exception item', async () => {
      await deleteExceptionListById({
        http: httpMock,
        id: '1',
        namespaceType: 'single',
        signal: abortCtrl.signal,
      });
      expect(httpMock.fetch).toHaveBeenCalledWith('/api/exception_lists', {
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
        http: httpMock,
        id: '1',
        namespaceType: 'single',
        signal: abortCtrl.signal,
      });
      expect(exceptionResponse).toEqual(getExceptionListSchemaMock());
    });

    test('it returns error if response payload fails decode', async () => {
      const badPayload = getExceptionListSchemaMock();
      // @ts-expect-error
      delete badPayload.id;
      httpMock.fetch.mockResolvedValue(badPayload);

      await expect(
        deleteExceptionListById({
          http: httpMock,
          id: '1',
          namespaceType: 'single',
          signal: abortCtrl.signal,
        })
      ).rejects.toEqual(new Error('Invalid value "undefined" supplied to "id"'));
    });
  });

  describe('#deleteExceptionListItemById', () => {
    beforeEach(() => {
      httpMock.fetch.mockResolvedValue(getExceptionListItemSchemaMock());
    });

    test('check parameter url, body when deleting exception item', async () => {
      await deleteExceptionListItemById({
        http: httpMock,
        id: '1',
        namespaceType: 'single',
        signal: abortCtrl.signal,
      });
      expect(httpMock.fetch).toHaveBeenCalledWith('/api/exception_lists/items', {
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
        http: httpMock,
        id: '1',
        namespaceType: 'single',
        signal: abortCtrl.signal,
      });
      expect(exceptionResponse).toEqual(getExceptionListItemSchemaMock());
    });

    test('it returns error if response payload fails decode', async () => {
      const badPayload = getExceptionListItemSchemaMock();
      // @ts-expect-error
      delete badPayload.id;
      httpMock.fetch.mockResolvedValue(badPayload);

      await expect(
        deleteExceptionListItemById({
          http: httpMock,
          id: '1',
          namespaceType: 'single',
          signal: abortCtrl.signal,
        })
      ).rejects.toEqual(new Error('Invalid value "undefined" supplied to "id"'));
    });
  });

  describe('#addEndpointExceptionList', () => {
    beforeEach(() => {
      httpMock.fetch.mockResolvedValue(getExceptionListSchemaMock());
    });

    test('it invokes "addEndpointExceptionList" with expected url and body values', async () => {
      await addEndpointExceptionList({
        http: httpMock,
        signal: abortCtrl.signal,
      });
      expect(httpMock.fetch).toHaveBeenCalledWith('/api/endpoint_list', {
        method: 'POST',
        signal: abortCtrl.signal,
      });
    });

    test('it returns expected exception list on success', async () => {
      const exceptionResponse = await addEndpointExceptionList({
        http: httpMock,
        signal: abortCtrl.signal,
      });
      expect(exceptionResponse).toEqual(getExceptionListSchemaMock());
    });

    test('it returns an empty object when list already exists', async () => {
      httpMock.fetch.mockResolvedValue({});
      const exceptionResponse = await addEndpointExceptionList({
        http: httpMock,
        signal: abortCtrl.signal,
      });
      expect(exceptionResponse).toEqual({});
    });
  });

  describe('#exportExceptionList', () => {
    const blob: Blob = {
      arrayBuffer: jest.fn(),
      size: 89,
      slice: jest.fn(),
      stream: jest.fn(),
      text: jest.fn(),
      type: 'json',
    } as Blob;

    beforeEach(() => {
      httpMock.fetch.mockResolvedValue(blob);
    });

    test('it invokes "exportExceptionList" with expected url and body values', async () => {
      await exportExceptionList({
        http: httpMock,
        id: 'some-id',
        listId: 'list-id',
        namespaceType: 'single',
        signal: abortCtrl.signal,
      });

      expect(httpMock.fetch).toHaveBeenCalledWith('/api/exception_lists/_export', {
        method: 'POST',
        query: {
          id: 'some-id',
          list_id: 'list-id',
          namespace_type: 'single',
        },
        signal: abortCtrl.signal,
      });
    });

    test('it returns expected list to export on success', async () => {
      const exceptionResponse = await exportExceptionList({
        http: httpMock,
        id: 'some-id',
        listId: 'list-id',
        namespaceType: 'single',
        signal: abortCtrl.signal,
      });
      expect(exceptionResponse).toEqual(blob);
    });
  });
});
