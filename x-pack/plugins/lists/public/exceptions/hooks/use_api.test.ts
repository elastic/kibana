/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react-hooks';

import { coreMock } from '../../../../../../src/core/public/mocks';
import * as api from '../api';
import { getExceptionListSchemaMock } from '../../../common/schemas/response/exception_list_schema.mock';
import { getFoundExceptionListItemSchemaMock } from '../../../common/schemas/response/found_exception_list_item_schema.mock';
import { getExceptionListItemSchemaMock } from '../../../common/schemas/response/exception_list_item_schema.mock';
import { HttpStart } from '../../../../../../src/core/public';
import { ApiCallByIdProps, ApiCallByListIdProps } from '../types';

import { ExceptionsApi, useApi } from './use_api';

const mockKibanaHttpService = coreMock.createStart().http;

describe('useApi', () => {
  const onErrorMock = jest.fn();

  afterEach(() => {
    onErrorMock.mockClear();
    jest.clearAllMocks();
  });

  test('it invokes "deleteExceptionListItemById" when "deleteExceptionItem" used', async () => {
    const payload = getExceptionListItemSchemaMock();
    const onSuccessMock = jest.fn();
    const spyOnDeleteExceptionListItemById = jest
      .spyOn(api, 'deleteExceptionListItemById')
      .mockResolvedValue(payload);

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<HttpStart, ExceptionsApi>(() =>
        useApi(mockKibanaHttpService)
      );
      await waitForNextUpdate();

      const { id, namespace_type: namespaceType } = payload;

      await result.current.deleteExceptionItem({
        id,
        namespaceType,
        onError: jest.fn(),
        onSuccess: onSuccessMock,
      });

      const expected: ApiCallByIdProps = {
        http: mockKibanaHttpService,
        id,
        namespaceType,
        signal: new AbortController().signal,
      };

      expect(spyOnDeleteExceptionListItemById).toHaveBeenCalledWith(expected);
      expect(onSuccessMock).toHaveBeenCalled();
    });
  });

  test('invokes "onError" callback if "deleteExceptionListItemById" fails', async () => {
    const mockError = new Error('failed to delete item');
    jest.spyOn(api, 'deleteExceptionListItemById').mockRejectedValue(mockError);

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<HttpStart, ExceptionsApi>(() =>
        useApi(mockKibanaHttpService)
      );
      await waitForNextUpdate();

      const { id, namespace_type: namespaceType } = getExceptionListItemSchemaMock();

      await result.current.deleteExceptionItem({
        id,
        namespaceType,
        onError: onErrorMock,
        onSuccess: jest.fn(),
      });

      expect(onErrorMock).toHaveBeenCalledWith(mockError);
    });
  });

  test('it invokes "deleteExceptionListById" when "deleteExceptionList" used', async () => {
    const payload = getExceptionListSchemaMock();
    const onSuccessMock = jest.fn();
    const spyOnDeleteExceptionListById = jest
      .spyOn(api, 'deleteExceptionListById')
      .mockResolvedValue(payload);

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<HttpStart, ExceptionsApi>(() =>
        useApi(mockKibanaHttpService)
      );
      await waitForNextUpdate();

      const { id, namespace_type: namespaceType } = payload;

      await result.current.deleteExceptionList({
        id,
        namespaceType,
        onError: jest.fn(),
        onSuccess: onSuccessMock,
      });

      const expected: ApiCallByIdProps = {
        http: mockKibanaHttpService,
        id,
        namespaceType,
        signal: new AbortController().signal,
      };

      expect(spyOnDeleteExceptionListById).toHaveBeenCalledWith(expected);
      expect(onSuccessMock).toHaveBeenCalled();
    });
  });

  test('invokes "onError" callback if "deleteExceptionListById" fails', async () => {
    const mockError = new Error('failed to delete item');
    jest.spyOn(api, 'deleteExceptionListById').mockRejectedValue(mockError);

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<HttpStart, ExceptionsApi>(() =>
        useApi(mockKibanaHttpService)
      );
      await waitForNextUpdate();

      const { id, namespace_type: namespaceType } = getExceptionListSchemaMock();

      await result.current.deleteExceptionList({
        id,
        namespaceType,
        onError: onErrorMock,
        onSuccess: jest.fn(),
      });

      expect(onErrorMock).toHaveBeenCalledWith(mockError);
    });
  });

  test('it invokes "fetchExceptionListItemById" when "getExceptionItem" used', async () => {
    const payload = getExceptionListItemSchemaMock();
    const onSuccessMock = jest.fn();
    const spyOnFetchExceptionListItemById = jest
      .spyOn(api, 'fetchExceptionListItemById')
      .mockResolvedValue(payload);

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<HttpStart, ExceptionsApi>(() =>
        useApi(mockKibanaHttpService)
      );
      await waitForNextUpdate();

      const { id, namespace_type: namespaceType } = payload;

      await result.current.getExceptionItem({
        id,
        namespaceType,
        onError: jest.fn(),
        onSuccess: onSuccessMock,
      });

      const expected: ApiCallByIdProps = {
        http: mockKibanaHttpService,
        id,
        namespaceType,
        signal: new AbortController().signal,
      };

      expect(spyOnFetchExceptionListItemById).toHaveBeenCalledWith(expected);
      expect(onSuccessMock).toHaveBeenCalled();
    });
  });

  test('invokes "onError" callback if "fetchExceptionListItemById" fails', async () => {
    const mockError = new Error('failed to delete item');
    jest.spyOn(api, 'fetchExceptionListItemById').mockRejectedValue(mockError);

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<HttpStart, ExceptionsApi>(() =>
        useApi(mockKibanaHttpService)
      );
      await waitForNextUpdate();

      const { id, namespace_type: namespaceType } = getExceptionListSchemaMock();

      await result.current.getExceptionItem({
        id,
        namespaceType,
        onError: onErrorMock,
        onSuccess: jest.fn(),
      });

      expect(onErrorMock).toHaveBeenCalledWith(mockError);
    });
  });

  test('it invokes "fetchExceptionListById" when "getExceptionList" used', async () => {
    const payload = getExceptionListSchemaMock();
    const onSuccessMock = jest.fn();
    const spyOnFetchExceptionListById = jest
      .spyOn(api, 'fetchExceptionListById')
      .mockResolvedValue(payload);

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<HttpStart, ExceptionsApi>(() =>
        useApi(mockKibanaHttpService)
      );
      await waitForNextUpdate();

      const { id, namespace_type: namespaceType } = payload;

      await result.current.getExceptionList({
        id,
        namespaceType,
        onError: jest.fn(),
        onSuccess: onSuccessMock,
      });

      const expected: ApiCallByIdProps = {
        http: mockKibanaHttpService,
        id,
        namespaceType,
        signal: new AbortController().signal,
      };

      expect(spyOnFetchExceptionListById).toHaveBeenCalledWith(expected);
      expect(onSuccessMock).toHaveBeenCalled();
    });
  });

  test('invokes "onError" callback if "fetchExceptionListById" fails', async () => {
    const mockError = new Error('failed to delete item');
    jest.spyOn(api, 'fetchExceptionListById').mockRejectedValue(mockError);

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<HttpStart, ExceptionsApi>(() =>
        useApi(mockKibanaHttpService)
      );
      await waitForNextUpdate();

      const { id, namespace_type: namespaceType } = getExceptionListSchemaMock();

      await result.current.getExceptionList({
        id,
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
