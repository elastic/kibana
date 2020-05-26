/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act, renderHook } from '@testing-library/react-hooks';

import * as api from '../api';
import { createKibanaCoreStartMock } from '../../common/mocks/kibana_core';

import { ReturnExceptionListAndItems, useExceptionList } from './use_exception_list';

jest.mock('../api');

const mockKibanaHttpService = createKibanaCoreStartMock().http;

describe('useExceptionList', () => {
  test('init', async () => {
    const onError = jest.fn();
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, ReturnExceptionListAndItems>(() =>
        useExceptionList({ http: mockKibanaHttpService, id: 'myListId', onError })
      );
      await waitForNextUpdate();
      expect(result.current).toEqual([true, null]);
    });
  });

  test('fetch exception list and items', async () => {
    const onError = jest.fn();
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, ReturnExceptionListAndItems>(() =>
        useExceptionList({ http: mockKibanaHttpService, id: 'myListId', onError })
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      expect(result.current).toEqual([
        false,
        {
          _tags: ['endpoint', 'process', 'malware', 'os:linux'],
          created_at: '2020-04-23T00:19:13.289Z',
          created_by: 'user_name',
          description: 'This is a sample endpoint type exception',
          exceptionItems: {
            data: [
              {
                _tags: ['endpoint', 'process', 'malware', 'os:linux'],
                comment: [],
                created_at: '2020-04-23T00:19:13.289Z',
                created_by: 'user_name',
                description: 'This is a sample endpoint type exception',
                entries: [
                  {
                    field: 'actingProcess.file.signer',
                    match: 'Elastic, N.V.',
                    match_any: undefined,
                    operator: 'included',
                  },
                  {
                    field: 'event.category',
                    match: undefined,
                    match_any: ['process', 'malware'],
                    operator: 'included',
                  },
                ],
                id: '1',
                item_id: 'endpoint_list_item',
                list_id: 'endpoint_list',
                meta: {},
                name: 'Sample Endpoint Exception List',
                tags: ['user added string for a tag', 'malware'],
                tie_breaker_id: '77fd1909-6786-428a-a671-30229a719c1f',
                type: 'simple',
                updated_at: '2020-04-23T00:19:13.289Z',
                updated_by: 'user_name',
              },
            ],
            page: 1,
            per_page: 20,
            total: 1,
          },
          id: '1',
          list_id: 'endpoint_list',
          meta: {},
          name: 'Sample Endpoint Exception List',
          tags: ['user added string for a tag', 'malware'],
          tie_breaker_id: '77fd1909-6786-428a-a671-30229a719c1f',
          type: 'endpoint',
          updated_at: '2020-04-23T00:19:13.289Z',
          updated_by: 'user_name',
        },
      ]);
    });
  });

  test('fetch a new exception list and its items', async () => {
    const onError = jest.fn();
    const spyOnfetchExceptionListById = jest.spyOn(api, 'fetchExceptionListById');
    const spyOnfetchExceptionListItemsByListId = jest.spyOn(api, 'fetchExceptionListItemsByListId');
    await act(async () => {
      const { rerender, waitForNextUpdate } = renderHook<string, ReturnExceptionListAndItems>(
        (id) => useExceptionList({ http: mockKibanaHttpService, id, onError }),
        {
          initialProps: 'myListId',
        }
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      rerender('newListId');
      await waitForNextUpdate();
      expect(spyOnfetchExceptionListById).toHaveBeenCalledTimes(2);
      expect(spyOnfetchExceptionListItemsByListId).toHaveBeenCalledTimes(2);
    });
  });
});
