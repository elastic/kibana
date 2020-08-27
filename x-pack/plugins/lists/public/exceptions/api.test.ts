/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { coreMock } from '../../../../../src/core/public/mocks';
import { getExceptionListSchemaMock } from '../../common/schemas/response/exception_list_schema.mock';
import { getExceptionListItemSchemaMock } from '../../common/schemas/response/exception_list_item_schema.mock';
import { getCreateExceptionListSchemaMock } from '../../common/schemas/request/create_exception_list_schema.mock';
import { getCreateExceptionListItemSchemaMock } from '../../common/schemas/request/create_exception_list_item_schema.mock';
import { getFoundExceptionListItemSchemaMock } from '../../common/schemas/response/found_exception_list_item_schema.mock';
import { getUpdateExceptionListItemSchemaMock } from '../../common/schemas/request/update_exception_list_item_schema.mock';
import { getUpdateExceptionListSchemaMock } from '../../common/schemas/request/update_exception_list_schema.mock';
import {
  CreateExceptionListItemSchema,
  CreateExceptionListSchema,
  ExceptionListItemSchema,
  ExceptionListSchema,
} from '../../common/schemas';

import {
  addEndpointExceptionList,
  addExceptionList,
  addExceptionListItem,
  deleteExceptionListById,
  deleteExceptionListItemById,
  fetchExceptionListById,
  fetchExceptionListItemById,
  fetchExceptionListsItemsByListIds,
  updateExceptionList,
  updateExceptionListItem,
} from './api';
import { ApiCallByIdProps, ApiCallByListIdProps } from './types';

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

    test('it returns error and does not make request if request payload fails decode', async () => {
      const payload: Omit<CreateExceptionListSchema, 'description'> & {
        description?: string[];
      } = { ...getCreateExceptionListSchemaMock(), description: ['123'] };

      await expect(
        addExceptionList({
          http: httpMock,
          list: (payload as unknown) as ExceptionListSchema,
          signal: abortCtrl.signal,
        })
      ).rejects.toEqual('Invalid value "["123"]" supplied to "description"');
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
      ).rejects.toEqual('Invalid value "undefined" supplied to "id"');
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

    test('it returns error and does not make request if request payload fails decode', async () => {
      const payload: Omit<CreateExceptionListItemSchema, 'description'> & {
        description?: string[];
      } = { ...getCreateExceptionListItemSchemaMock(), description: ['123'] };

      await expect(
        addExceptionListItem({
          http: httpMock,
          listItem: (payload as unknown) as ExceptionListItemSchema,
          signal: abortCtrl.signal,
        })
      ).rejects.toEqual('Invalid value "["123"]" supplied to "description"');
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
      ).rejects.toEqual('Invalid value "undefined" supplied to "id"');
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

    test('it returns error and does not make request if request payload fails decode', async () => {
      const payload = getUpdateExceptionListSchemaMock();
      // @ts-expect-error
      delete payload.description;

      await expect(
        updateExceptionList({
          http: httpMock,
          list: payload,
          signal: abortCtrl.signal,
        })
      ).rejects.toEqual('Invalid value "undefined" supplied to "description"');
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
      ).rejects.toEqual('Invalid value "undefined" supplied to "id"');
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

    test('it returns error and does not make request if request payload fails decode', async () => {
      const payload = getUpdateExceptionListItemSchemaMock();
      // @ts-expect-error
      delete payload.description;

      await expect(
        updateExceptionListItem({
          http: httpMock,
          listItem: payload,
          signal: abortCtrl.signal,
        })
      ).rejects.toEqual('Invalid value "undefined" supplied to "description"');
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
      ).rejects.toEqual('Invalid value "undefined" supplied to "id"');
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

    test('it returns error and does not make request if request payload fails decode', async () => {
      const payload = ({
        http: httpMock,
        id: 1,
        namespaceType: 'single',
        signal: abortCtrl.signal,
      } as unknown) as ApiCallByIdProps & { id: number };
      await expect(fetchExceptionListById(payload)).rejects.toEqual(
        'Invalid value "1" supplied to "id"'
      );
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
      ).rejects.toEqual('Invalid value "undefined" supplied to "id"');
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

    test('it returns error and does not make request if request payload fails decode', async () => {
      const payload = ({
        filterOptions: [],
        http: httpMock,
        listIds: ['myList'],
        namespaceTypes: ['not a namespace type'],
        pagination: {
          page: 1,
          perPage: 20,
        },
        signal: abortCtrl.signal,
      } as unknown) as ApiCallByListIdProps & { listId: number };
      await expect(fetchExceptionListsItemsByListIds(payload)).rejects.toEqual(
        'Invalid value "not a namespace type" supplied to "namespace_type"'
      );
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
        'Invalid value "undefined" supplied to "data",Invalid value "undefined" supplied to "page",Invalid value "undefined" supplied to "per_page",Invalid value "undefined" supplied to "total"'
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

    test('it returns error and does not make request if request payload fails decode', async () => {
      const payload = ({
        http: httpMock,
        id: '1',
        namespaceType: 'not a namespace type',
        signal: abortCtrl.signal,
      } as unknown) as ApiCallByIdProps & { namespaceType: string };
      await expect(fetchExceptionListItemById(payload)).rejects.toEqual(
        'Invalid value "not a namespace type" supplied to "namespace_type"'
      );
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
      ).rejects.toEqual('Invalid value "undefined" supplied to "id"');
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

    test('it returns error and does not make request if request payload fails decode', async () => {
      const payload = ({
        http: httpMock,
        id: 1,
        namespaceType: 'single',
        signal: abortCtrl.signal,
      } as unknown) as ApiCallByIdProps & { id: number };
      await expect(deleteExceptionListById(payload)).rejects.toEqual(
        'Invalid value "1" supplied to "id"'
      );
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
      ).rejects.toEqual('Invalid value "undefined" supplied to "id"');
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

    test('it returns error and does not make request if request payload fails decode', async () => {
      const payload = ({
        http: httpMock,
        id: 1,
        namespaceType: 'single',
        signal: abortCtrl.signal,
      } as unknown) as ApiCallByIdProps & { id: number };
      await expect(deleteExceptionListItemById(payload)).rejects.toEqual(
        'Invalid value "1" supplied to "id"'
      );
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
      ).rejects.toEqual('Invalid value "undefined" supplied to "id"');
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
});
