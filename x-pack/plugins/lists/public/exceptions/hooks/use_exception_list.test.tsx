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
import { ExceptionListSchema } from '../../../common/schemas';
import { ExceptionItemsAndPagination, UseExceptionListProps } from '../types';

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
          id: 'myListId',
          namespaceType: 'single',
          onError: onErrorMock,
        })
      );
      await waitForNextUpdate();

      expect(result.current).toEqual([true, null, null, null]);
    });
  });

  test('fetch exception list and items', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<
        UseExceptionListProps,
        ReturnExceptionListAndItems
      >(() =>
        useExceptionList({
          http: mockKibanaHttpService,
          id: 'myListId',
          namespaceType: 'single',
          onError: onErrorMock,
        })
      );
      await waitForNextUpdate();
      await waitForNextUpdate();

      const expectedListResult: ExceptionListSchema = getExceptionListSchemaMock();

      const expectedListItemsResult: ExceptionItemsAndPagination = {
        items: [getExceptionListItemSchemaMock()],
        pagination: {
          page: 1,
          perPage: 20,
          total: 1,
        },
      };

      expect(result.current).toEqual([
        false,
        expectedListResult,
        expectedListItemsResult,
        result.current[3],
      ]);
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
        ({ filterOptions, http, id, namespaceType, pagination, onError }) =>
          useExceptionList({ filterOptions, http, id, namespaceType, onError, pagination }),
        {
          initialProps: {
            http: mockKibanaHttpService,
            id: 'myListId',
            namespaceType: 'single',
            onError: onErrorMock,
          },
        }
      );
      await waitForNextUpdate();
      rerender({
        http: mockKibanaHttpService,
        id: 'newListId',
        namespaceType: 'single',
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
          id: 'myListId',
          namespaceType: 'single',
          onError: onErrorMock,
        })
      );
      await waitForNextUpdate();
      await waitForNextUpdate();

      expect(typeof result.current[3]).toEqual('function');

      if (result.current[3] != null) {
        result.current[3]({ listId: 'myListId', listNamespaceType: 'single' });
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
            id: 'myListId',
            namespaceType: 'single',
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
            id: 'myListId',
            namespaceType: 'single',
            onError: onErrorMock,
          })
      );
      await waitForNextUpdate();
      await waitForNextUpdate();

      expect(onErrorMock).toHaveBeenCalledWith(mockError);
    });
  });
});
