/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act, renderHook } from '@testing-library/react-hooks';

import * as api from '../api';
import { getCreateExceptionListItemSchemaMock } from '../../../common/schemas/request/create_exception_list_item_schema.mock';
import { getUpdateExceptionListItemSchemaMock } from '../../../common/schemas/request/update_exception_list_item_schema.mock';
import { getExceptionListItemSchemaMock } from '../../../common/schemas/response/exception_list_item_schema.mock';
import { createKibanaCoreStartMock } from '../../common/mocks/kibana_core';
import { PersistHookProps } from '../types';

import { ReturnPersistExceptionItem, usePersistExceptionItem } from './persist_exception_item';

const mockKibanaHttpService = createKibanaCoreStartMock().http;

describe('usePersistExceptionItem', () => {
  const onError = jest.fn();

  beforeEach(() => {
    jest.spyOn(api, 'addExceptionListItem').mockResolvedValue(getExceptionListItemSchemaMock());
    jest.spyOn(api, 'updateExceptionListItem').mockResolvedValue(getExceptionListItemSchemaMock());
  });

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
      result.current[1](getCreateExceptionListItemSchemaMock());
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
      result.current[1](getCreateExceptionListItemSchemaMock());
      await waitForNextUpdate();

      expect(result.current).toEqual([{ isLoading: false, isSaved: true }, result.current[1]]);
    });
  });

  test('it invokes "updateExceptionListItem" when payload has "id"', async () => {
    const addExceptionItem = jest.spyOn(api, 'addExceptionListItem');
    const updateExceptionItem = jest.spyOn(api, 'updateExceptionListItem');
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<
        PersistHookProps,
        ReturnPersistExceptionItem
      >(() => usePersistExceptionItem({ http: mockKibanaHttpService, onError }));

      await waitForNextUpdate();
      result.current[1](getUpdateExceptionListItemSchemaMock());
      await waitForNextUpdate();

      expect(result.current).toEqual([{ isLoading: false, isSaved: true }, result.current[1]]);
      expect(addExceptionItem).not.toHaveBeenCalled();
      expect(updateExceptionItem).toHaveBeenCalled();
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
      result.current[1](getCreateExceptionListItemSchemaMock());
      await waitForNextUpdate();

      expect(result.current).toEqual([{ isLoading: false, isSaved: false }, result.current[1]]);
      expect(onError).toHaveBeenCalledWith(error);
    });
  });
});
