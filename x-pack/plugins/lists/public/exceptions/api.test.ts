/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { createKibanaCoreStartMock } from '../common/mocks/kibana_core';
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
  addExceptionList,
  addExceptionListItem,
  deleteExceptionListById,
  deleteExceptionListItemById,
  fetchExceptionListById,
  fetchExceptionListItemById,
  fetchExceptionListItemsByListId,
  updateExceptionList,
  updateExceptionListItem,
} from './api';
import { ApiCallByIdProps, ApiCallByListIdProps } from './types';

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
      fetchMock.mockResolvedValue(getExceptionListSchemaMock());
    });

    test('it invokes "addExceptionList" with expected url and body values', async () => {
      const payload = getCreateExceptionListSchemaMock();
      await addExceptionList({
        http: mockKibanaHttpService(),
        list: payload,
        signal: abortCtrl.signal,
      });
      // TODO Would like to just use getExceptionListSchemaMock() here, but
      // validation returns object in different order, making the strings not match
      expect(fetchMock).toHaveBeenCalledWith('/api/exception_lists', {
        body: JSON.stringify(payload),
        method: 'POST',
        signal: abortCtrl.signal,
      });
    });

    test('it returns expected exception list on success', async () => {
      const payload = getCreateExceptionListSchemaMock();
      const exceptionResponse = await addExceptionList({
        http: mockKibanaHttpService(),
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
          http: mockKibanaHttpService(),
          list: (payload as unknown) as ExceptionListSchema,
          signal: abortCtrl.signal,
        })
      ).rejects.toEqual('Invalid value "["123"]" supplied to "description"');
    });

    test('it returns error if response payload fails decode', async () => {
      const payload = getCreateExceptionListSchemaMock();
      const badPayload = getExceptionListSchemaMock();
      delete badPayload.id;
      fetchMock.mockResolvedValue(badPayload);

      await expect(
        addExceptionList({
          http: mockKibanaHttpService(),
          list: payload,
          signal: abortCtrl.signal,
        })
      ).rejects.toEqual('Invalid value "undefined" supplied to "id"');
    });
  });

  describe('#addExceptionListItem', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(getExceptionListItemSchemaMock());
    });

    test('it invokes "addExceptionListItem" with expected url and body values', async () => {
      const payload = getCreateExceptionListItemSchemaMock();
      await addExceptionListItem({
        http: mockKibanaHttpService(),
        listItem: payload,
        signal: abortCtrl.signal,
      });
      // TODO Would like to just use getExceptionListSchemaMock() here, but
      // validation returns object in different order, making the strings not match
      expect(fetchMock).toHaveBeenCalledWith('/api/exception_lists/items', {
        body: JSON.stringify(payload),
        method: 'POST',
        signal: abortCtrl.signal,
      });
    });

    test('it returns expected exception list on success', async () => {
      const payload = getCreateExceptionListItemSchemaMock();
      const exceptionResponse = await addExceptionListItem({
        http: mockKibanaHttpService(),
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
          http: mockKibanaHttpService(),
          listItem: (payload as unknown) as ExceptionListItemSchema,
          signal: abortCtrl.signal,
        })
      ).rejects.toEqual('Invalid value "["123"]" supplied to "description"');
    });

    test('it returns error if response payload fails decode', async () => {
      const payload = getCreateExceptionListItemSchemaMock();
      const badPayload = getExceptionListItemSchemaMock();
      delete badPayload.id;
      fetchMock.mockResolvedValue(badPayload);

      await expect(
        addExceptionListItem({
          http: mockKibanaHttpService(),
          listItem: payload,
          signal: abortCtrl.signal,
        })
      ).rejects.toEqual('Invalid value "undefined" supplied to "id"');
    });
  });

  describe('#updateExceptionList', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(getExceptionListSchemaMock());
    });

    test('it invokes "updateExceptionList" with expected url and body values', async () => {
      const payload = getUpdateExceptionListSchemaMock();
      await updateExceptionList({
        http: mockKibanaHttpService(),
        list: payload,
        signal: abortCtrl.signal,
      });
      // TODO Would like to just use getExceptionListSchemaMock() here, but
      // validation returns object in different order, making the strings not match
      expect(fetchMock).toHaveBeenCalledWith('/api/exception_lists', {
        body: JSON.stringify(payload),
        method: 'PUT',
        signal: abortCtrl.signal,
      });
    });

    test('it returns expected exception list on success', async () => {
      const payload = getUpdateExceptionListSchemaMock();
      const exceptionResponse = await updateExceptionList({
        http: mockKibanaHttpService(),
        list: payload,
        signal: abortCtrl.signal,
      });
      expect(exceptionResponse).toEqual(getExceptionListSchemaMock());
    });

    test('it returns error and does not make request if request payload fails decode', async () => {
      const payload = getUpdateExceptionListSchemaMock();
      delete payload.description;

      await expect(
        updateExceptionList({
          http: mockKibanaHttpService(),
          list: payload,
          signal: abortCtrl.signal,
        })
      ).rejects.toEqual('Invalid value "undefined" supplied to "description"');
    });

    test('it returns error if response payload fails decode', async () => {
      const payload = getUpdateExceptionListSchemaMock();
      const badPayload = getExceptionListSchemaMock();
      delete badPayload.id;
      fetchMock.mockResolvedValue(badPayload);

      await expect(
        updateExceptionList({
          http: mockKibanaHttpService(),
          list: payload,
          signal: abortCtrl.signal,
        })
      ).rejects.toEqual('Invalid value "undefined" supplied to "id"');
    });
  });

  describe('#updateExceptionListItem', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(getExceptionListItemSchemaMock());
    });

    test('it invokes "updateExceptionListItem" with expected url and body values', async () => {
      const payload = getUpdateExceptionListItemSchemaMock();
      await updateExceptionListItem({
        http: mockKibanaHttpService(),
        listItem: payload,
        signal: abortCtrl.signal,
      });
      // TODO Would like to just use getExceptionListSchemaMock() here, but
      // validation returns object in different order, making the strings not match
      expect(fetchMock).toHaveBeenCalledWith('/api/exception_lists/items', {
        body: JSON.stringify(payload),
        method: 'PUT',
        signal: abortCtrl.signal,
      });
    });

    test('it returns expected exception list on success', async () => {
      const payload = getUpdateExceptionListItemSchemaMock();
      const exceptionResponse = await updateExceptionListItem({
        http: mockKibanaHttpService(),
        listItem: payload,
        signal: abortCtrl.signal,
      });
      expect(exceptionResponse).toEqual(getExceptionListItemSchemaMock());
    });

    test('it returns error and does not make request if request payload fails decode', async () => {
      const payload = getUpdateExceptionListItemSchemaMock();
      delete payload.description;

      await expect(
        updateExceptionListItem({
          http: mockKibanaHttpService(),
          listItem: payload,
          signal: abortCtrl.signal,
        })
      ).rejects.toEqual('Invalid value "undefined" supplied to "description"');
    });

    test('it returns error if response payload fails decode', async () => {
      const payload = getUpdateExceptionListItemSchemaMock();
      const badPayload = getExceptionListItemSchemaMock();
      delete badPayload.id;
      fetchMock.mockResolvedValue(badPayload);

      await expect(
        updateExceptionListItem({
          http: mockKibanaHttpService(),
          listItem: payload,
          signal: abortCtrl.signal,
        })
      ).rejects.toEqual('Invalid value "undefined" supplied to "id"');
    });
  });

  describe('#fetchExceptionListById', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(getExceptionListSchemaMock());
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
      expect(exceptionResponse).toEqual(getExceptionListSchemaMock());
    });

    test('it returns error and does not make request if request payload fails decode', async () => {
      const payload = ({
        http: mockKibanaHttpService(),
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
      delete badPayload.id;
      fetchMock.mockResolvedValue(badPayload);

      await expect(
        fetchExceptionListById({
          http: mockKibanaHttpService(),
          id: '1',
          namespaceType: 'single',
          signal: abortCtrl.signal,
        })
      ).rejects.toEqual('Invalid value "undefined" supplied to "id"');
    });
  });

  describe('#fetchExceptionListItemsByListId', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(getFoundExceptionListItemSchemaMock());
    });

    test('it invokes "fetchExceptionListItemsByListId" with expected url and body values', async () => {
      await fetchExceptionListItemsByListId({
        http: mockKibanaHttpService(),
        listId: 'myList',
        namespaceType: 'single',
        pagination: {
          page: 1,
          perPage: 20,
        },
        signal: abortCtrl.signal,
      });

      expect(fetchMock).toHaveBeenCalledWith('/api/exception_lists/items/_find', {
        method: 'GET',
        query: {
          list_id: 'myList',
          namespace_type: 'single',
          page: '1',
          per_page: '20',
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
        pagination: {
          page: 1,
          perPage: 20,
        },
        signal: abortCtrl.signal,
      });

      expect(fetchMock).toHaveBeenCalledWith('/api/exception_lists/items/_find', {
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
      await fetchExceptionListItemsByListId({
        filterOptions: {
          filter: 'hello world',
          tags: [],
        },
        http: mockKibanaHttpService(),
        listId: 'myList',
        namespaceType: 'agnostic',
        pagination: {
          page: 1,
          perPage: 20,
        },
        signal: abortCtrl.signal,
      });

      expect(fetchMock).toHaveBeenCalledWith('/api/exception_lists/items/_find', {
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
      await fetchExceptionListItemsByListId({
        filterOptions: {
          filter: '',
          tags: ['malware'],
        },
        http: mockKibanaHttpService(),
        listId: 'myList',
        namespaceType: 'agnostic',
        pagination: {
          page: 1,
          perPage: 20,
        },
        signal: abortCtrl.signal,
      });

      expect(fetchMock).toHaveBeenCalledWith('/api/exception_lists/items/_find', {
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
      await fetchExceptionListItemsByListId({
        filterOptions: {
          filter: 'host.name',
          tags: ['malware'],
        },
        http: mockKibanaHttpService(),
        listId: 'myList',
        namespaceType: 'agnostic',
        pagination: {
          page: 1,
          perPage: 20,
        },
        signal: abortCtrl.signal,
      });

      expect(fetchMock).toHaveBeenCalledWith('/api/exception_lists/items/_find', {
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
      const exceptionResponse = await fetchExceptionListItemsByListId({
        http: mockKibanaHttpService(),
        listId: 'endpoint_list',
        namespaceType: 'single',
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
        http: mockKibanaHttpService(),
        listId: '1',
        namespaceType: 'not a namespace type',
        pagination: {
          page: 1,
          perPage: 20,
        },
        signal: abortCtrl.signal,
      } as unknown) as ApiCallByListIdProps & { listId: number };
      await expect(fetchExceptionListItemsByListId(payload)).rejects.toEqual(
        'Invalid value "not a namespace type" supplied to "namespace_type"'
      );
    });

    test('it returns error if response payload fails decode', async () => {
      const badPayload = getExceptionListItemSchemaMock();
      delete badPayload.id;
      fetchMock.mockResolvedValue(badPayload);

      await expect(
        fetchExceptionListItemsByListId({
          http: mockKibanaHttpService(),
          listId: 'myList',
          namespaceType: 'single',
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
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(getExceptionListItemSchemaMock());
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
      expect(exceptionResponse).toEqual(getExceptionListItemSchemaMock());
    });

    test('it returns error and does not make request if request payload fails decode', async () => {
      const payload = ({
        http: mockKibanaHttpService(),
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
      delete badPayload.id;
      fetchMock.mockResolvedValue(badPayload);

      await expect(
        fetchExceptionListItemById({
          http: mockKibanaHttpService(),
          id: '1',
          namespaceType: 'single',
          signal: abortCtrl.signal,
        })
      ).rejects.toEqual('Invalid value "undefined" supplied to "id"');
    });
  });

  describe('#deleteExceptionListById', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(getExceptionListSchemaMock());
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
      expect(exceptionResponse).toEqual(getExceptionListSchemaMock());
    });

    test('it returns error and does not make request if request payload fails decode', async () => {
      const payload = ({
        http: mockKibanaHttpService(),
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
      delete badPayload.id;
      fetchMock.mockResolvedValue(badPayload);

      await expect(
        deleteExceptionListById({
          http: mockKibanaHttpService(),
          id: '1',
          namespaceType: 'single',
          signal: abortCtrl.signal,
        })
      ).rejects.toEqual('Invalid value "undefined" supplied to "id"');
    });
  });

  describe('#deleteExceptionListItemById', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(getExceptionListItemSchemaMock());
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
      expect(exceptionResponse).toEqual(getExceptionListItemSchemaMock());
    });

    test('it returns error and does not make request if request payload fails decode', async () => {
      const payload = ({
        http: mockKibanaHttpService(),
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
      delete badPayload.id;
      fetchMock.mockResolvedValue(badPayload);

      await expect(
        deleteExceptionListItemById({
          http: mockKibanaHttpService(),
          id: '1',
          namespaceType: 'single',
          signal: abortCtrl.signal,
        })
      ).rejects.toEqual('Invalid value "undefined" supplied to "id"');
    });
  });
});
