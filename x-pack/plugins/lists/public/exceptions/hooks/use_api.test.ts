/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act, renderHook } from '@testing-library/react-hooks';

import * as api from '../api';
import { createKibanaCoreStartMock } from '../../common/mocks/kibana_core';
import { getExceptionListSchemaMock } from '../../../common/schemas/response/exception_list_schema.mock';
import { getFoundExceptionListItemSchemaMock } from '../../../common/schemas/response/found_exception_list_item_schema.mock';
import { getExceptionListItemSchemaMock } from '../../../common/schemas/response/exception_list_item_schema.mock';
import { HttpStart } from '../../../../../../src/core/public';
import { ApiCallByListIdProps, ApiCallListItemProps, ApiCallListProps } from '../types';

import { ExceptionsApi, useApi } from './use_api';

const mockKibanaHttpService = createKibanaCoreStartMock().http;

describe('useApi', () => {
  const onErrorMock = jest.fn();

  afterEach(() => {
    onErrorMock.mockClear();
    jest.clearAllMocks();
  });

  test('it invokes "deleteExceptionListItem" when "deleteExceptionItem" used', async () => {
    const payload = getExceptionListItemSchemaMock();
    const onSuccessMock = jest.fn();
    const spyOnDeleteExceptionListItem = jest
      .spyOn(api, 'deleteExceptionListItem')
      .mockResolvedValue(payload);

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<HttpStart, ExceptionsApi>(() =>
        useApi(mockKibanaHttpService)
      );
      await waitForNextUpdate();

      const { id, item_id: itemId, namespace_type: namespaceType } = payload;

      await result.current.deleteExceptionItem({
        id,
        itemId,
        namespaceType,
        onError: jest.fn(),
        onSuccess: onSuccessMock,
      });

      const expected: ApiCallListItemProps = {
        http: mockKibanaHttpService,
        id,
        itemId,
        namespaceType,
        signal: new AbortController().signal,
      };

      expect(spyOnDeleteExceptionListItem).toHaveBeenCalledWith(expected);
      expect(onSuccessMock).toHaveBeenCalled();
    });
  });

  test('invokes "onError" callback if "deleteExceptionListItem" fails', async () => {
    const mockError = new Error('failed to delete item');
    jest.spyOn(api, 'deleteExceptionListItem').mockRejectedValue(mockError);

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<HttpStart, ExceptionsApi>(() =>
        useApi(mockKibanaHttpService)
      );
      await waitForNextUpdate();

      const {
        id,
        item_id: itemId,
        namespace_type: namespaceType,
      } = getExceptionListItemSchemaMock();

      await result.current.deleteExceptionItem({
        id,
        itemId,
        namespaceType,
        onError: onErrorMock,
        onSuccess: jest.fn(),
      });

      expect(onErrorMock).toHaveBeenCalledWith(mockError);
    });
  });

  test('it invokes "deleteExceptionList" when "deleteExceptionList" used', async () => {
    const payload = getExceptionListSchemaMock();
    const onSuccessMock = jest.fn();
    const spyOnDeleteExceptionList = jest
      .spyOn(api, 'deleteExceptionList')
      .mockResolvedValue(payload);

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<HttpStart, ExceptionsApi>(() =>
        useApi(mockKibanaHttpService)
      );
      await waitForNextUpdate();

      const { id, list_id: listId, namespace_type: namespaceType } = payload;

      await result.current.deleteExceptionList({
        id,
        listId,
        namespaceType,
        onError: jest.fn(),
        onSuccess: onSuccessMock,
      });

      const expected: ApiCallListProps = {
        http: mockKibanaHttpService,
        id,
        listId,
        namespaceType,
        signal: new AbortController().signal,
      };

      expect(spyOnDeleteExceptionList).toHaveBeenCalledWith(expected);
      expect(onSuccessMock).toHaveBeenCalled();
    });
  });

  test('invokes "onError" callback if "deleteExceptionList" fails', async () => {
    const mockError = new Error('failed to delete item');
    jest.spyOn(api, 'deleteExceptionList').mockRejectedValue(mockError);

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<HttpStart, ExceptionsApi>(() =>
        useApi(mockKibanaHttpService)
      );
      await waitForNextUpdate();

      const { id, list_id: listId, namespace_type: namespaceType } = getExceptionListSchemaMock();

      await result.current.deleteExceptionList({
        id,
        listId,
        namespaceType,
        onError: onErrorMock,
        onSuccess: jest.fn(),
      });

      expect(onErrorMock).toHaveBeenCalledWith(mockError);
    });
  });

  test('it invokes "fetchExceptionListItem" when "getExceptionItem" used', async () => {
    const payload = getExceptionListItemSchemaMock();
    const onSuccessMock = jest.fn();
    const spyOnFetchExceptionListItem = jest
      .spyOn(api, 'fetchExceptionListItem')
      .mockResolvedValue(payload);

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<HttpStart, ExceptionsApi>(() =>
        useApi(mockKibanaHttpService)
      );
      await waitForNextUpdate();

      const { id, item_id: itemId, namespace_type: namespaceType } = payload;

      await result.current.getExceptionItem({
        id,
        itemId,
        namespaceType,
        onError: jest.fn(),
        onSuccess: onSuccessMock,
      });

      const expected: ApiCallListItemProps = {
        http: mockKibanaHttpService,
        id,
        itemId,
        namespaceType,
        signal: new AbortController().signal,
      };

      expect(spyOnFetchExceptionListItem).toHaveBeenCalledWith(expected);
      expect(onSuccessMock).toHaveBeenCalled();
    });
  });

  test('invokes "onError" callback if "fetchExceptionListItem" fails', async () => {
    const mockError = new Error('failed to delete item');
    jest.spyOn(api, 'fetchExceptionListItem').mockRejectedValue(mockError);

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<HttpStart, ExceptionsApi>(() =>
        useApi(mockKibanaHttpService)
      );
      await waitForNextUpdate();

      const {
        id,
        item_id: itemId,
        namespace_type: namespaceType,
      } = getExceptionListItemSchemaMock();

      await result.current.getExceptionItem({
        id,
        itemId,
        namespaceType,
        onError: onErrorMock,
        onSuccess: jest.fn(),
      });

      expect(onErrorMock).toHaveBeenCalledWith(mockError);
    });
  });

  test('it invokes "fetchExceptionList" when "getExceptionList" used', async () => {
    const payload = getExceptionListSchemaMock();
    const onSuccessMock = jest.fn();
    const spyOnFetchExceptionList = jest
      .spyOn(api, 'fetchExceptionList')
      .mockResolvedValue(payload);

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<HttpStart, ExceptionsApi>(() =>
        useApi(mockKibanaHttpService)
      );
      await waitForNextUpdate();

      const { id, list_id: listId, namespace_type: namespaceType } = payload;

      await result.current.getExceptionList({
        id,
        listId,
        namespaceType,
        onError: jest.fn(),
        onSuccess: onSuccessMock,
      });

      const expected: ApiCallListProps = {
        http: mockKibanaHttpService,
        id,
        listId,
        namespaceType,
        signal: new AbortController().signal,
      };

      expect(spyOnFetchExceptionList).toHaveBeenCalledWith(expected);
      expect(onSuccessMock).toHaveBeenCalled();
    });
  });

  test('invokes "onError" callback if "fetchExceptionList" fails', async () => {
    const mockError = new Error('failed to delete item');
    jest.spyOn(api, 'fetchExceptionList').mockRejectedValue(mockError);

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<HttpStart, ExceptionsApi>(() =>
        useApi(mockKibanaHttpService)
      );
      await waitForNextUpdate();

      const { id, list_id: listId, namespace_type: namespaceType } = getExceptionListSchemaMock();

      await result.current.getExceptionList({
        id,
        listId,
        namespaceType,
        onError: onErrorMock,
        onSuccess: jest.fn(),
      });

      expect(onErrorMock).toHaveBeenCalledWith(mockError);
    });
  });

  test('it invokes "fetchExceptionListsItemsByListIds" when "getExceptionItem" used', async () => {
    const output = getFoundExceptionListItemSchemaMock();
    const onSuccessMock = jest.fn();
    const spyOnFetchExceptionListsItemsByListIds = jest
      .spyOn(api, 'fetchExceptionListsItemsByListIds')
      .mockResolvedValue(output);

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<HttpStart, ExceptionsApi>(() =>
        useApi(mockKibanaHttpService)
      );
      await waitForNextUpdate();

      await result.current.getExceptionListsItems({
        filterOptions: [],
        lists: [{ id: 'myListId', listId: 'list_id', namespaceType: 'single', type: 'detection' }],
        onError: jest.fn(),
        onSuccess: onSuccessMock,
        pagination: {
          page: 1,
          perPage: 20,
          total: 0,
        },
        showDetectionsListsOnly: false,
        showEndpointListsOnly: false,
      });

      const expected: ApiCallByListIdProps = {
        filterOptions: [],
        http: mockKibanaHttpService,
        listIds: ['list_id'],
        namespaceTypes: ['single'],
        pagination: {
          page: 1,
          perPage: 20,
          total: 0,
        },
        signal: new AbortController().signal,
      };

      expect(spyOnFetchExceptionListsItemsByListIds).toHaveBeenCalledWith(expected);
      expect(onSuccessMock).toHaveBeenCalled();
    });
  });

  test('it does not invoke "fetchExceptionListsItemsByListIds" if no listIds', async () => {
    const output = getFoundExceptionListItemSchemaMock();
    const onSuccessMock = jest.fn();
    const spyOnFetchExceptionListsItemsByListIds = jest
      .spyOn(api, 'fetchExceptionListsItemsByListIds')
      .mockResolvedValue(output);

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<HttpStart, ExceptionsApi>(() =>
        useApi(mockKibanaHttpService)
      );
      await waitForNextUpdate();

      await result.current.getExceptionListsItems({
        filterOptions: [],
        lists: [{ id: 'myListId', listId: 'list_id', namespaceType: 'single', type: 'detection' }],
        onError: jest.fn(),
        onSuccess: onSuccessMock,
        pagination: {
          page: 1,
          perPage: 20,
          total: 0,
        },
        showDetectionsListsOnly: false,
        showEndpointListsOnly: true,
      });

      expect(spyOnFetchExceptionListsItemsByListIds).not.toHaveBeenCalled();
      expect(onSuccessMock).toHaveBeenCalledWith({
        exceptions: [],
        pagination: {
          page: 0,
          perPage: 20,
          total: 0,
        },
      });
    });
  });

  test('invokes "onError" callback if "fetchExceptionListsItemsByListIds" fails', async () => {
    const mockError = new Error('failed to delete item');
    jest.spyOn(api, 'fetchExceptionListsItemsByListIds').mockRejectedValue(mockError);

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<HttpStart, ExceptionsApi>(() =>
        useApi(mockKibanaHttpService)
      );
      await waitForNextUpdate();

      await result.current.getExceptionListsItems({
        filterOptions: [],
        lists: [{ id: 'myListId', listId: 'list_id', namespaceType: 'single', type: 'detection' }],
        onError: onErrorMock,
        onSuccess: jest.fn(),
        pagination: {
          page: 1,
          perPage: 20,
          total: 0,
        },
        showDetectionsListsOnly: false,
        showEndpointListsOnly: false,
      });

      expect(onErrorMock).toHaveBeenCalledWith(mockError);
    });
  });
});
