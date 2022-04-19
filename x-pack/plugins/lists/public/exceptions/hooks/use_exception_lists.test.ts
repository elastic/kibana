/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react-hooks';
import type {
  ExceptionListSchema,
  UseExceptionListsProps,
} from '@kbn/securitysolution-io-ts-list-types';
import * as api from '@kbn/securitysolution-list-api';
import { ReturnExceptionLists, useExceptionLists } from '@kbn/securitysolution-list-hooks';
import { coreMock } from '@kbn/core/public/mocks';

import { getFoundExceptionListSchemaMock } from '../../../common/schemas/response/found_exception_list_schema.mock';

const mockKibanaHttpService = coreMock.createStart().http;
const mockKibanaNotificationsService = coreMock.createStart().notifications;
jest.mock('@kbn/securitysolution-list-api');

// TODO: Move this test to the kbn package: packages/kbn-securitysolution-list-hooks/src/use_exception_lists/index.test.ts once mocks are ported over

describe('useExceptionLists', () => {
  beforeEach(() => {
    jest.spyOn(api, 'fetchExceptionLists').mockResolvedValue(getFoundExceptionListSchemaMock());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('initializes hook', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<
        UseExceptionListsProps,
        ReturnExceptionLists
      >(() =>
        useExceptionLists({
          errorMessage: 'Uh oh',
          filterOptions: {},
          http: mockKibanaHttpService,
          initialPagination: {
            page: 1,
            perPage: 20,
            total: 0,
          },
          namespaceTypes: ['single', 'agnostic'],
          notifications: mockKibanaNotificationsService,
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
        expect.any(Function),
        expect.any(Function),
      ]);
    });
  });

  test('fetches exception lists', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<
        UseExceptionListsProps,
        ReturnExceptionLists
      >(() =>
        useExceptionLists({
          errorMessage: 'Uh oh',
          filterOptions: {},
          http: mockKibanaHttpService,
          initialPagination: {
            page: 1,
            perPage: 20,
            total: 0,
          },
          namespaceTypes: ['single', 'agnostic'],
          notifications: mockKibanaNotificationsService,
        })
      );
      // NOTE: First `waitForNextUpdate` is initialization
      // Second call applies the params
      await waitForNextUpdate();
      await waitForNextUpdate();

      const expectedListItemsResult: ExceptionListSchema[] = getFoundExceptionListSchemaMock().data;

      expect(result.current).toEqual([
        false,
        expectedListItemsResult,
        {
          page: 1,
          perPage: 20,
          total: 1,
        },
        expect.any(Function),
        expect.any(Function),
      ]);
    });
  });

  test('does not fetch specific list id if it is added to the hideLists array', async () => {
    const spyOnfetchExceptionLists = jest.spyOn(api, 'fetchExceptionLists');

    await act(async () => {
      const { waitForNextUpdate } = renderHook<UseExceptionListsProps, ReturnExceptionLists>(() =>
        useExceptionLists({
          errorMessage: 'Uh oh',
          filterOptions: {},
          hideLists: ['listId-1'],
          http: mockKibanaHttpService,
          initialPagination: {
            page: 1,
            perPage: 20,
            total: 0,
          },
          namespaceTypes: ['single', 'agnostic'],
          notifications: mockKibanaNotificationsService,
        })
      );
      // NOTE: First `waitForNextUpdate` is initialization
      // Second call applies the params
      await waitForNextUpdate();
      await waitForNextUpdate();

      expect(spyOnfetchExceptionLists).toHaveBeenCalledWith({
        filters:
          '(not exception-list.attributes.list_id: listId-1* AND not exception-list-agnostic.attributes.list_id: listId-1*)',
        http: mockKibanaHttpService,
        namespaceTypes: 'single,agnostic',
        pagination: { page: 1, perPage: 20 },
        signal: new AbortController().signal,
      });
    });
  });

  test('applies filters to query', async () => {
    const spyOnfetchExceptionLists = jest.spyOn(api, 'fetchExceptionLists');

    await act(async () => {
      const { waitForNextUpdate } = renderHook<UseExceptionListsProps, ReturnExceptionLists>(() =>
        useExceptionLists({
          errorMessage: 'Uh oh',
          filterOptions: {
            created_by: 'Moi',
            name: 'Sample Endpoint',
          },
          hideLists: ['listId-1'],
          http: mockKibanaHttpService,
          initialPagination: {
            page: 1,
            perPage: 20,
            total: 0,
          },
          namespaceTypes: ['single', 'agnostic'],
          notifications: mockKibanaNotificationsService,
        })
      );
      // NOTE: First `waitForNextUpdate` is initialization
      // Second call applies the params
      await waitForNextUpdate();
      await waitForNextUpdate();

      expect(spyOnfetchExceptionLists).toHaveBeenCalledWith({
        filters:
          '(exception-list.attributes.created_by:Moi OR exception-list-agnostic.attributes.created_by:Moi) AND (exception-list.attributes.name.text:Sample Endpoint OR exception-list-agnostic.attributes.name.text:Sample Endpoint) AND (not exception-list.attributes.list_id: listId-1* AND not exception-list-agnostic.attributes.list_id: listId-1*)',
        http: mockKibanaHttpService,
        namespaceTypes: 'single,agnostic',
        pagination: { page: 1, perPage: 20 },
        signal: new AbortController().signal,
      });
    });
  });

  test('fetches a new exception list and its items when props change', async () => {
    const spyOnfetchExceptionLists = jest.spyOn(api, 'fetchExceptionLists');
    await act(async () => {
      const { rerender, waitForNextUpdate } = renderHook<
        UseExceptionListsProps,
        ReturnExceptionLists
      >(
        ({ errorMessage, filterOptions, http, initialPagination, namespaceTypes, notifications }) =>
          useExceptionLists({
            errorMessage,
            filterOptions,
            http,
            initialPagination,
            namespaceTypes,
            notifications,
          }),
        {
          initialProps: {
            errorMessage: 'Uh oh',
            filterOptions: {},
            http: mockKibanaHttpService,
            initialPagination: {
              page: 1,
              perPage: 20,
              total: 0,
            },
            namespaceTypes: ['single'],
            notifications: mockKibanaNotificationsService,
          },
        }
      );
      // NOTE: First `waitForNextUpdate` is initialization
      // Second call applies the params
      await waitForNextUpdate();
      await waitForNextUpdate();

      rerender({
        errorMessage: 'Uh oh',
        filterOptions: {},
        http: mockKibanaHttpService,
        initialPagination: {
          page: 1,
          perPage: 20,
          total: 0,
        },
        namespaceTypes: ['single', 'agnostic'],
        notifications: mockKibanaNotificationsService,
      });
      // NOTE: Only need one call here because hook already initilaized
      await waitForNextUpdate();

      expect(spyOnfetchExceptionLists).toHaveBeenCalledTimes(2);
    });
  });

  test('fetches list when refreshExceptionList callback invoked', async () => {
    const spyOnfetchExceptionLists = jest.spyOn(api, 'fetchExceptionLists');
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<
        UseExceptionListsProps,
        ReturnExceptionLists
      >(() =>
        useExceptionLists({
          errorMessage: 'Uh oh',
          filterOptions: {},
          http: mockKibanaHttpService,
          initialPagination: {
            page: 1,
            perPage: 20,
            total: 0,
          },
          namespaceTypes: ['single', 'agnostic'],
          notifications: mockKibanaNotificationsService,
        })
      );
      // NOTE: First `waitForNextUpdate` is initialization
      // Second call applies the params
      await waitForNextUpdate();
      await waitForNextUpdate();

      expect(typeof result.current[3]).toEqual('function');

      if (result.current[4] != null) {
        result.current[4]();
      }
      // NOTE: Only need one call here because hook already initilaized
      await waitForNextUpdate();

      expect(spyOnfetchExceptionLists).toHaveBeenCalledTimes(2);
    });
  });

  test('invokes notifications service if "fetchExceptionLists" fails', async () => {
    const mockError = new Error('failed to fetches list items');
    const spyOnfetchExceptionLists = jest
      .spyOn(api, 'fetchExceptionLists')
      .mockRejectedValue(mockError);
    await act(async () => {
      const { waitForNextUpdate } = renderHook<UseExceptionListsProps, ReturnExceptionLists>(() =>
        useExceptionLists({
          errorMessage: 'Uh oh',
          filterOptions: {},
          http: mockKibanaHttpService,
          initialPagination: {
            page: 1,
            perPage: 20,
            total: 0,
          },
          namespaceTypes: ['single', 'agnostic'],
          notifications: mockKibanaNotificationsService,
        })
      );
      // NOTE: First `waitForNextUpdate` is initialization
      // Second call applies the params
      await waitForNextUpdate();
      await waitForNextUpdate();

      expect(mockKibanaNotificationsService.toasts.addError).toHaveBeenCalledWith(mockError, {
        title: 'Uh oh',
      });
      expect(spyOnfetchExceptionLists).toHaveBeenCalledTimes(1);
    });
  });
});
