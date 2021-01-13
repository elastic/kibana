/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act, renderHook } from '@testing-library/react-hooks';

import { coreMock } from '../../../../../../src/core/public/mocks';
import * as api from '../api';
import { getFoundExceptionListSchemaMock } from '../../../common/schemas/response/found_exception_list_schema.mock';
import { ExceptionListSchema } from '../../../common/schemas';
import { UseExceptionListsProps } from '../types';

import { ReturnExceptionLists, useExceptionLists } from './use_exception_lists';

const mockKibanaHttpService = coreMock.createStart().http;
const mockKibanaNotificationsService = coreMock.createStart().notifications;

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
          namespaceTypes: ['single', 'agnostic'],
          notifications: mockKibanaNotificationsService,
          pagination: {
            page: 1,
            perPage: 20,
            total: 0,
          },
          showTrustedApps: false,
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
          namespaceTypes: ['single', 'agnostic'],
          notifications: mockKibanaNotificationsService,
          pagination: {
            page: 1,
            perPage: 20,
            total: 0,
          },
          showTrustedApps: false,
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
          perPage: 1,
          total: 1,
        },
        result.current[3],
      ]);
    });
  });

  test('fetches trusted apps lists if "showTrustedApps" is true', async () => {
    const spyOnfetchExceptionLists = jest.spyOn(api, 'fetchExceptionLists');

    await act(async () => {
      const { waitForNextUpdate } = renderHook<UseExceptionListsProps, ReturnExceptionLists>(() =>
        useExceptionLists({
          errorMessage: 'Uh oh',
          filterOptions: {},
          http: mockKibanaHttpService,
          namespaceTypes: ['single', 'agnostic'],
          notifications: mockKibanaNotificationsService,
          pagination: {
            page: 1,
            perPage: 20,
            total: 0,
          },
          showTrustedApps: true,
        })
      );
      // NOTE: First `waitForNextUpdate` is initialization
      // Second call applies the params
      await waitForNextUpdate();
      await waitForNextUpdate();

      expect(spyOnfetchExceptionLists).toHaveBeenCalledWith({
        filters:
          '(exception-list.attributes.list_id: endpoint_trusted_apps* OR exception-list-agnostic.attributes.list_id: endpoint_trusted_apps*)',
        http: mockKibanaHttpService,
        namespaceTypes: 'single,agnostic',
        pagination: { page: 1, perPage: 20 },
        signal: new AbortController().signal,
      });
    });
  });

  test('does not fetch trusted apps lists if "showTrustedApps" is false', async () => {
    const spyOnfetchExceptionLists = jest.spyOn(api, 'fetchExceptionLists');

    await act(async () => {
      const { waitForNextUpdate } = renderHook<UseExceptionListsProps, ReturnExceptionLists>(() =>
        useExceptionLists({
          errorMessage: 'Uh oh',
          filterOptions: {},
          http: mockKibanaHttpService,
          namespaceTypes: ['single', 'agnostic'],
          notifications: mockKibanaNotificationsService,
          pagination: {
            page: 1,
            perPage: 20,
            total: 0,
          },
          showTrustedApps: false,
        })
      );
      // NOTE: First `waitForNextUpdate` is initialization
      // Second call applies the params
      await waitForNextUpdate();
      await waitForNextUpdate();

      expect(spyOnfetchExceptionLists).toHaveBeenCalledWith({
        filters:
          '(not exception-list.attributes.list_id: endpoint_trusted_apps* AND not exception-list-agnostic.attributes.list_id: endpoint_trusted_apps*)',
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
          http: mockKibanaHttpService,
          namespaceTypes: ['single', 'agnostic'],
          notifications: mockKibanaNotificationsService,
          pagination: {
            page: 1,
            perPage: 20,
            total: 0,
          },
          showTrustedApps: false,
        })
      );
      // NOTE: First `waitForNextUpdate` is initialization
      // Second call applies the params
      await waitForNextUpdate();
      await waitForNextUpdate();

      expect(spyOnfetchExceptionLists).toHaveBeenCalledWith({
        filters:
          '(exception-list.attributes.created_by:Moi* OR exception-list-agnostic.attributes.created_by:Moi*) AND (exception-list.attributes.name:Sample Endpoint* OR exception-list-agnostic.attributes.name:Sample Endpoint*) AND (not exception-list.attributes.list_id: endpoint_trusted_apps* AND not exception-list-agnostic.attributes.list_id: endpoint_trusted_apps*)',
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
        ({
          errorMessage,
          filterOptions,
          http,
          namespaceTypes,
          notifications,
          pagination,
          showTrustedApps,
        }) =>
          useExceptionLists({
            errorMessage,
            filterOptions,
            http,
            namespaceTypes,
            notifications,
            pagination,
            showTrustedApps,
          }),
        {
          initialProps: {
            errorMessage: 'Uh oh',
            filterOptions: {},
            http: mockKibanaHttpService,
            namespaceTypes: ['single'],
            notifications: mockKibanaNotificationsService,
            pagination: {
              page: 1,
              perPage: 20,
              total: 0,
            },
            showTrustedApps: false,
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
        namespaceTypes: ['single', 'agnostic'],
        notifications: mockKibanaNotificationsService,
        pagination: {
          page: 1,
          perPage: 20,
          total: 0,
        },
        showTrustedApps: false,
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
          namespaceTypes: ['single', 'agnostic'],
          notifications: mockKibanaNotificationsService,
          pagination: {
            page: 1,
            perPage: 20,
            total: 0,
          },
          showTrustedApps: false,
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
          namespaceTypes: ['single', 'agnostic'],
          notifications: mockKibanaNotificationsService,
          pagination: {
            page: 1,
            perPage: 20,
            total: 0,
          },
          showTrustedApps: false,
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
