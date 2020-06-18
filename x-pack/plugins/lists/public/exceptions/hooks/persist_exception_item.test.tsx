/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act, renderHook } from '@testing-library/react-hooks';

import * as api from '../api';
import { getExceptionListItemSchemaMock } from '../../../common/schemas/response/exception_list_item_schema.mock';
import { createKibanaCoreStartMock } from '../../common/mocks/kibana_core';
import { PersistHookProps } from '../types';

import { ReturnPersistExceptionItem, usePersistExceptionItem } from './persist_exception_item';

jest.mock('../api');

const mockKibanaHttpService = createKibanaCoreStartMock().http;

describe('usePersistExceptionItem', () => {
  const onError = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('initializes hook', async () => {
    const { result } = renderHook<PersistHookProps, ReturnPersistExceptionItem>(() =>
      usePersistExceptionItem({ http: mockKibanaHttpService, onError })
    );

    expect(result.current).toEqual([{ isLoading: false, isSaved: false }, result.current[1]]);
  });

  test('"isLoading" is "true" when exception item is being saved', async () => {
    await act(async () => {
      const { result, rerender, waitForNextUpdate } = renderHook<
        PersistHookProps,
        ReturnPersistExceptionItem
      >(() => usePersistExceptionItem({ http: mockKibanaHttpService, onError }));

      await waitForNextUpdate();
      result.current[1](getExceptionListItemSchemaMock());
      rerender();

      expect(result.current).toEqual([{ isLoading: true, isSaved: false }, result.current[1]]);
    });
  });

  test('"isSaved" is "true" when exception item saved successfully', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<
        PersistHookProps,
        ReturnPersistExceptionItem
      >(() => usePersistExceptionItem({ http: mockKibanaHttpService, onError }));

      await waitForNextUpdate();
      result.current[1](getExceptionListItemSchemaMock());
      await waitForNextUpdate();

      expect(result.current).toEqual([{ isLoading: false, isSaved: true }, result.current[1]]);
    });
  });

  test('"onError" callback is invoked and "isSaved" is "false" when api call fails', async () => {
    const error = new Error('persist rule failed');
    jest.spyOn(api, 'addExceptionListItem').mockRejectedValue(error);

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<
        PersistHookProps,
        ReturnPersistExceptionItem
      >(() => usePersistExceptionItem({ http: mockKibanaHttpService, onError }));

      await waitForNextUpdate();
      result.current[1](getExceptionListItemSchemaMock());
      await waitForNextUpdate();

      expect(result.current).toEqual([{ isLoading: false, isSaved: false }, result.current[1]]);
      expect(onError).toHaveBeenCalledWith(error);
    });
  });
});
