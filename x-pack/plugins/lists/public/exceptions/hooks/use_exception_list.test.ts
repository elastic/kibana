/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act, renderHook } from '@testing-library/react-hooks';

import { coreMock } from '../../../../../../src/core/public/mocks';
import * as api from '../api';
import { getFoundExceptionListItemSchemaMock } from '../../../common/schemas/response/found_exception_list_item_schema.mock';
import { ExceptionListItemSchema } from '../../../common/schemas';
import { UseExceptionListProps, UseExceptionListSuccess } from '../types';

import { ReturnExceptionListAndItems, useExceptionList } from './use_exception_list';

const mockKibanaHttpService = coreMock.createStart().http;

describe('useExceptionList', () => {
  const onErrorMock = jest.fn();

  beforeEach(() => {
    jest
      .spyOn(api, 'fetchExceptionListsItemsByListIds')
      .mockResolvedValue(getFoundExceptionListItemSchemaMock());
  });

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
          filterOptions: [],
          http: mockKibanaHttpService,
          lists: [
            { id: 'myListId', listId: 'list_id', namespaceType: 'single', type: 'detection' },
          ],
          matchFilters: false,
          onError: onErrorMock,
          pagination: {
            page: 1,
            perPage: 20,
            total: 0,
          },
          showDetectionsListsOnly: false,
          showEndpointListsOnly: false,
        })
      );
      await waitForNextUpdate();

      expect(result.current).toEqual([
        true,
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

  test('fetches exception items', async () => {
    await act(async () => {
      const onSuccessMock = jest.fn();
      const { result, waitForNextUpdate } = renderHook<
        UseExceptionListProps,
        ReturnExceptionListAndItems
      >(() =>
        useExceptionList({
          filterOptions: [],
          http: mockKibanaHttpService,
          lists: [
            { id: 'myListId', listId: 'list_id', namespaceType: 'single', type: 'detection' },
          ],
          matchFilters: false,
          onError: onErrorMock,
          onSuccess: onSuccessMock,
          pagination: {
            page: 1,
            perPage: 20,
            total: 0,
          },
          showDetectionsListsOnly: false,
          showEndpointListsOnly: false,
        })
      );
      // NOTE: First `waitForNextUpdate` is initialization
      // Second call applies the params
      await waitForNextUpdate();
      await waitForNextUpdate();

      const expectedListItemsResult: ExceptionListItemSchema[] = getFoundExceptionListItemSchemaMock()
        .data;
      const expectedResult: UseExceptionListSuccess = {
        exceptions: expectedListItemsResult,
        pagination: { page: 1, perPage: 1, total: 1 },
      };

      expect(result.current).toEqual([
        false,
        expectedListItemsResult,
        {
          page: 1,
          perPage: 1,
          total: 1,
        },
        result.current[3],
      ]);
      expect(onSuccessMock).toHaveBeenCalledWith(expectedResult);
    });
  });

  test('fetches only detection list items if "showDetectionsListsOnly" is true', async () => {
    const spyOnfetchExceptionListsItemsByListIds = jest.spyOn(
      api,
      'fetchExceptionListsItemsByListIds'
    );

    await act(async () => {
      const onSuccessMock = jest.fn();
      const { waitForNextUpdate } = renderHook<UseExceptionListProps, ReturnExceptionListAndItems>(
        () =>
          useExceptionList({
            filterOptions: [],
            http: mockKibanaHttpService,
            lists: [
              { id: 'myListId', listId: 'list_id', namespaceType: 'single', type: 'detection' },
              {
                id: 'myListIdEndpoint',
                listId: 'list_id_endpoint',
                namespaceType: 'agnostic',
                type: 'endpoint',
              },
            ],
            matchFilters: false,
            onError: onErrorMock,
            onSuccess: onSuccessMock,
            pagination: {
              page: 1,
              perPage: 20,
              total: 0,
            },
            showDetectionsListsOnly: true,
            showEndpointListsOnly: false,
          })
      );
      // NOTE: First `waitForNextUpdate` is initialization
      // Second call applies the params
      await waitForNextUpdate();
      await waitForNextUpdate();

      expect(spyOnfetchExceptionListsItemsByListIds).toHaveBeenCalledWith({
        filterOptions: [],
        http: mockKibanaHttpService,
        listIds: ['list_id'],
        namespaceTypes: ['single'],
        pagination: { page: 1, perPage: 20 },
        signal: new AbortController().signal,
      });
    });
  });

  test('fetches only detection list items if "showEndpointListsOnly" is true', async () => {
    const spyOnfetchExceptionListsItemsByListIds = jest.spyOn(
      api,
      'fetchExceptionListsItemsByListIds'
    );

    await act(async () => {
      const onSuccessMock = jest.fn();
      const { waitForNextUpdate } = renderHook<UseExceptionListProps, ReturnExceptionListAndItems>(
        () =>
          useExceptionList({
            filterOptions: [],
            http: mockKibanaHttpService,
            lists: [
              { id: 'myListId', listId: 'list_id', namespaceType: 'single', type: 'detection' },
              {
                id: 'myListIdEndpoint',
                listId: 'list_id_endpoint',
                namespaceType: 'agnostic',
                type: 'endpoint',
              },
            ],
            matchFilters: false,
            onError: onErrorMock,
            onSuccess: onSuccessMock,
            pagination: {
              page: 1,
              perPage: 20,
              total: 0,
            },
            showDetectionsListsOnly: false,
            showEndpointListsOnly: true,
          })
      );
      // NOTE: First `waitForNextUpdate` is initialization
      // Second call applies the params
      await waitForNextUpdate();
      await waitForNextUpdate();

      expect(spyOnfetchExceptionListsItemsByListIds).toHaveBeenCalledWith({
        filterOptions: [],
        http: mockKibanaHttpService,
        listIds: ['list_id_endpoint'],
        namespaceTypes: ['agnostic'],
        pagination: { page: 1, perPage: 20 },
        signal: new AbortController().signal,
      });
    });
  });

  test('does not fetch items if no lists to fetch', async () => {
    const spyOnfetchExceptionListsItemsByListIds = jest.spyOn(
      api,
      'fetchExceptionListsItemsByListIds'
    );

    await act(async () => {
      const onSuccessMock = jest.fn();
      const { result, waitForNextUpdate } = renderHook<
        UseExceptionListProps,
        ReturnExceptionListAndItems
      >(() =>
        useExceptionList({
          filterOptions: [],
          http: mockKibanaHttpService,
          lists: [
            { id: 'myListId', listId: 'list_id', namespaceType: 'single', type: 'detection' },
          ],
          matchFilters: false,
          onError: onErrorMock,
          onSuccess: onSuccessMock,
          pagination: {
            page: 1,
            perPage: 20,
            total: 0,
          },
          showDetectionsListsOnly: false,
          showEndpointListsOnly: true,
        })
      );
      // NOTE: First `waitForNextUpdate` is initialization
      // Second call applies the params
      await waitForNextUpdate();
      await waitForNextUpdate();

      expect(spyOnfetchExceptionListsItemsByListIds).not.toHaveBeenCalled();
      expect(result.current).toEqual([
        false,
        [],
        {
          page: 0,
          perPage: 20,
          total: 0,
        },
        result.current[3],
      ]);
    });
  });

  test('applies first filterOptions filter to all lists if "matchFilters" is true', async () => {
    const spyOnfetchExceptionListsItemsByListIds = jest.spyOn(
      api,
      'fetchExceptionListsItemsByListIds'
    );

    await act(async () => {
      const onSuccessMock = jest.fn();
      const { waitForNextUpdate } = renderHook<UseExceptionListProps, ReturnExceptionListAndItems>(
        () =>
          useExceptionList({
            filterOptions: [{ filter: 'host.name', tags: [] }],
            http: mockKibanaHttpService,
            lists: [
              { id: 'myListId', listId: 'list_id', namespaceType: 'single', type: 'detection' },
              {
                id: 'myListIdEndpoint',
                listId: 'list_id_endpoint',
                namespaceType: 'agnostic',
                type: 'endpoint',
              },
            ],
            matchFilters: true,
            onError: onErrorMock,
            onSuccess: onSuccessMock,
            pagination: {
              page: 1,
              perPage: 20,
              total: 0,
            },
            showDetectionsListsOnly: false,
            showEndpointListsOnly: false,
          })
      );
      // NOTE: First `waitForNextUpdate` is initialization
      // Second call applies the params
      await waitForNextUpdate();
      await waitForNextUpdate();

      expect(spyOnfetchExceptionListsItemsByListIds).toHaveBeenCalledWith({
        filterOptions: [
          { filter: 'host.name', tags: [] },
          { filter: 'host.name', tags: [] },
        ],
        http: mockKibanaHttpService,
        listIds: ['list_id', 'list_id_endpoint'],
        namespaceTypes: ['single', 'agnostic'],
        pagination: { page: 1, perPage: 20 },
        signal: new AbortController().signal,
      });
    });
  });

  test('fetches a new exception list and its items', async () => {
    const spyOnfetchExceptionListsItemsByListIds = jest.spyOn(
      api,
      'fetchExceptionListsItemsByListIds'
    );
    const onSuccessMock = jest.fn();
    await act(async () => {
      const { rerender, waitForNextUpdate } = renderHook<
        UseExceptionListProps,
        ReturnExceptionListAndItems
      >(
        ({
          filterOptions,
          http,
          lists,
          matchFilters,
          pagination,
          onError,
          onSuccess,
          showDetectionsListsOnly,
          showEndpointListsOnly,
        }) =>
          useExceptionList({
            filterOptions,
            http,
            lists,
            matchFilters,
            onError,
            onSuccess,
            pagination,
            showDetectionsListsOnly,
            showEndpointListsOnly,
          }),
        {
          initialProps: {
            filterOptions: [],
            http: mockKibanaHttpService,
            lists: [
              { id: 'myListId', listId: 'list_id', namespaceType: 'single', type: 'detection' },
            ],
            matchFilters: false,
            onError: onErrorMock,
            onSuccess: onSuccessMock,
            pagination: {
              page: 1,
              perPage: 20,
              total: 0,
            },
            showDetectionsListsOnly: false,
            showEndpointListsOnly: false,
          },
        }
      );
      // NOTE: First `waitForNextUpdate` is initialization
      // Second call applies the params
      await waitForNextUpdate();
      await waitForNextUpdate();

      rerender({
        filterOptions: [],
        http: mockKibanaHttpService,
        lists: [
          { id: 'newListId', listId: 'new_list_id', namespaceType: 'single', type: 'detection' },
        ],
        matchFilters: false,
        onError: onErrorMock,
        onSuccess: onSuccessMock,
        pagination: {
          page: 1,
          perPage: 20,
          total: 0,
        },
        showDetectionsListsOnly: false,
        showEndpointListsOnly: false,
      });
      // NOTE: Only need one call here because hook already initilaized
      await waitForNextUpdate();

      expect(spyOnfetchExceptionListsItemsByListIds).toHaveBeenCalledTimes(2);
    });
  });

  test('fetches list and items when refreshExceptionList callback invoked', async () => {
    const spyOnfetchExceptionListsItemsByListIds = jest.spyOn(
      api,
      'fetchExceptionListsItemsByListIds'
    );
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<
        UseExceptionListProps,
        ReturnExceptionListAndItems
      >(() =>
        useExceptionList({
          filterOptions: [],
          http: mockKibanaHttpService,
          lists: [
            { id: 'myListId', listId: 'list_id', namespaceType: 'single', type: 'detection' },
          ],
          matchFilters: false,
          onError: onErrorMock,
          pagination: {
            page: 1,
            perPage: 20,
            total: 0,
          },
          showDetectionsListsOnly: false,
          showEndpointListsOnly: false,
        })
      );
      // NOTE: First `waitForNextUpdate` is initialization
      // Second call applies the params
      await waitForNextUpdate();
      await waitForNextUpdate();

      expect(typeof result.current[3]).toEqual('function');

      if (result.current[3] != null) {
        result.current[3]();
      }
      // NOTE: Only need one call here because hook already initilaized
      await waitForNextUpdate();

      expect(spyOnfetchExceptionListsItemsByListIds).toHaveBeenCalledTimes(2);
    });
  });

  test('invokes "onError" callback if "fetchExceptionListsItemsByListIds" fails', async () => {
    const mockError = new Error('failed to fetches list items');
    const spyOnfetchExceptionListsItemsByListIds = jest
      .spyOn(api, 'fetchExceptionListsItemsByListIds')
      .mockRejectedValue(mockError);
    await act(async () => {
      const { waitForNextUpdate } = renderHook<UseExceptionListProps, ReturnExceptionListAndItems>(
        () =>
          useExceptionList({
            filterOptions: [],
            http: mockKibanaHttpService,
            lists: [
              { id: 'myListId', listId: 'list_id', namespaceType: 'single', type: 'detection' },
            ],
            matchFilters: false,
            onError: onErrorMock,
            pagination: {
              page: 1,
              perPage: 20,
              total: 0,
            },
            showDetectionsListsOnly: false,
            showEndpointListsOnly: false,
          })
      );
      // NOTE: First `waitForNextUpdate` is initialization
      // Second call applies the params
      await waitForNextUpdate();
      await waitForNextUpdate();

      expect(onErrorMock).toHaveBeenCalledWith(mockError);
      expect(spyOnfetchExceptionListsItemsByListIds).toHaveBeenCalledTimes(1);
    });
  });
});
