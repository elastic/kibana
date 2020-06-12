/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act, renderHook } from '@testing-library/react-hooks';

import * as api from '../api';
import { createKibanaCoreStartMock } from '../../common/mocks/kibana_core';
import { getExceptionListSchemaMock } from '../../../common/schemas/response/exception_list_schema.mock';
import { getExceptionListItemSchemaMock } from '../../../common/schemas/response/exception_list_item_schema.mock';
import { ExceptionListItemSchema } from '../../../common/schemas';
import { ExceptionList, UseExceptionListProps, UseExceptionListSuccess } from '../types';

import { ReturnExceptionListAndItems, useExceptionList } from './use_exception_list';

jest.mock('../api');

const mockKibanaHttpService = createKibanaCoreStartMock().http;

describe('useExceptionList', () => {
  const onErrorMock = jest.fn();

  afterEach(() => {
    onErrorMock.mockClear();
    jest.clearAllMocks();
  });

  test('initializes hook', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<
        UseExceptionListProps,
        ReturnExceptionListAndItems
      >(() =>
        useExceptionList({
          http: mockKibanaHttpService,
          lists: [{ id: 'myListId', namespaceType: 'single' }],
          onError: onErrorMock,
        })
      );
      await waitForNextUpdate();

      expect(result.current).toEqual([
        true,
        [],
        [],
        {
          page: 1,
          perPage: 20,
          total: 0,
        },
        null,
      ]);
    });
  });

  test('fetch exception list and items', async () => {
    await act(async () => {
      const onSuccessMock = jest.fn();
      const { result, waitForNextUpdate } = renderHook<
        UseExceptionListProps,
        ReturnExceptionListAndItems
      >(() =>
        useExceptionList({
          http: mockKibanaHttpService,
          lists: [{ id: 'myListId', namespaceType: 'single' }],
          onError: onErrorMock,
          onSuccess: onSuccessMock,
        })
      );
      await waitForNextUpdate();
      await waitForNextUpdate();

      const expectedListResult: ExceptionList[] = [
        { ...getExceptionListSchemaMock(), totalItems: 1 },
      ];

      const expectedListItemsResult: ExceptionListItemSchema[] = [
        { ...getExceptionListItemSchemaMock() },
      ];

      const expectedResult: UseExceptionListSuccess = {
        exceptions: expectedListItemsResult,
        lists: expectedListResult,
        pagination: { page: 1, perPage: 20, total: 1 },
      };

      expect(result.current).toEqual([
        false,
        expectedListResult,
        expectedListItemsResult,
        {
          page: 1,
          perPage: 20,
          total: 1,
        },
        result.current[4],
      ]);
      expect(onSuccessMock).toHaveBeenCalledWith(expectedResult);
    });
  });

  test('fetch a new exception list and its items', async () => {
    const spyOnfetchExceptionListById = jest.spyOn(api, 'fetchExceptionListById');
    const spyOnfetchExceptionListItemsByListId = jest.spyOn(api, 'fetchExceptionListItemsByListId');
    await act(async () => {
      const { rerender, waitForNextUpdate } = renderHook<
        UseExceptionListProps,
        ReturnExceptionListAndItems
      >(
        ({ filterOptions, http, lists, pagination, onError, onSuccess }) =>
          useExceptionList({ filterOptions, http, lists, onError, onSuccess, pagination }),
        {
          initialProps: {
            http: mockKibanaHttpService,
            lists: [{ id: 'myListId', namespaceType: 'single' }],
            onError: onErrorMock,
            onSuccess: jest.fn(),
          },
        }
      );
      await waitForNextUpdate();
      rerender({
        http: mockKibanaHttpService,
        lists: [{ id: 'newListId', namespaceType: 'single' }],
        onError: onErrorMock,
      });
      await waitForNextUpdate();

      expect(spyOnfetchExceptionListById).toHaveBeenCalledTimes(2);
      expect(spyOnfetchExceptionListItemsByListId).toHaveBeenCalledTimes(2);
    });
  });

  test('fetches list and items when refreshExceptionList callback invoked', async () => {
    const spyOnfetchExceptionListById = jest.spyOn(api, 'fetchExceptionListById');
    const spyOnfetchExceptionListItemsByListId = jest.spyOn(api, 'fetchExceptionListItemsByListId');
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<
        UseExceptionListProps,
        ReturnExceptionListAndItems
      >(() =>
        useExceptionList({
          http: mockKibanaHttpService,
          lists: [{ id: 'myListId', namespaceType: 'single' }],
          onError: onErrorMock,
        })
      );
      await waitForNextUpdate();
      await waitForNextUpdate();

      expect(typeof result.current[4]).toEqual('function');

      if (result.current[4] != null) {
        result.current[4]();
      }

      await waitForNextUpdate();

      expect(spyOnfetchExceptionListById).toHaveBeenCalledTimes(2);
      expect(spyOnfetchExceptionListItemsByListId).toHaveBeenCalledTimes(2);
    });
  });

  test('invokes "onError" callback if "fetchExceptionListItemsByListId" fails', async () => {
    const mockError = new Error('failed to fetch list items');
    const spyOnfetchExceptionListById = jest.spyOn(api, 'fetchExceptionListById');
    const spyOnfetchExceptionListItemsByListId = jest
      .spyOn(api, 'fetchExceptionListItemsByListId')
      .mockRejectedValue(mockError);
    await act(async () => {
      const { waitForNextUpdate } = renderHook<UseExceptionListProps, ReturnExceptionListAndItems>(
        () =>
          useExceptionList({
            http: mockKibanaHttpService,
            lists: [{ id: 'myListId', namespaceType: 'single' }],
            onError: onErrorMock,
          })
      );
      await waitForNextUpdate();
      await waitForNextUpdate();

      expect(spyOnfetchExceptionListById).toHaveBeenCalledTimes(1);
      expect(onErrorMock).toHaveBeenCalledWith(mockError);
      expect(spyOnfetchExceptionListItemsByListId).toHaveBeenCalledTimes(1);
    });
  });

  test('invokes "onError" callback if "fetchExceptionListById" fails', async () => {
    const mockError = new Error('failed to fetch list');
    jest.spyOn(api, 'fetchExceptionListById').mockRejectedValue(mockError);

    await act(async () => {
      const { waitForNextUpdate } = renderHook<UseExceptionListProps, ReturnExceptionListAndItems>(
        () =>
          useExceptionList({
            http: mockKibanaHttpService,
            lists: [{ id: 'myListId', namespaceType: 'single' }],
            onError: onErrorMock,
          })
      );
      await waitForNextUpdate();
      await waitForNextUpdate();

      expect(onErrorMock).toHaveBeenCalledWith(mockError);
    });
  });
});
