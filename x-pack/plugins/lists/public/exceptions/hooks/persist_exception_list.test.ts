/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react-hooks';
import * as api from '@kbn/securitysolution-list-api';
import { PersistHookProps } from '@kbn/securitysolution-io-ts-list-types';
import {
  ReturnPersistExceptionList,
  usePersistExceptionList,
} from '@kbn/securitysolution-list-hooks';
import { coreMock } from '@kbn/core/public/mocks';

import { getCreateExceptionListSchemaMock } from '../../../common/schemas/request/create_exception_list_schema.mock';
import { getUpdateExceptionListSchemaMock } from '../../../common/schemas/request/update_exception_list_schema.mock';
import { getExceptionListSchemaMock } from '../../../common/schemas/response/exception_list_schema.mock';

const mockKibanaHttpService = coreMock.createStart().http;

jest.mock('@kbn/securitysolution-list-api');

// TODO: Port this to the kbn package of: packages/kbn-securitysolution-list-hooks/src/use_persist_exception_list/index.test.ts once the kibana mocks are ported

describe('usePersistExceptionList', () => {
  const onError = jest.fn();

  beforeEach(() => {
    jest.spyOn(api, 'addExceptionList').mockResolvedValue(getExceptionListSchemaMock());
    jest.spyOn(api, 'updateExceptionList').mockResolvedValue(getExceptionListSchemaMock());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('initializes hook', async () => {
    const { result } = renderHook<PersistHookProps, ReturnPersistExceptionList>(() =>
      usePersistExceptionList({ http: mockKibanaHttpService, onError })
    );

    expect(result.current).toEqual([{ isLoading: false, isSaved: false }, result.current[1]]);
  });

  test('"isLoading" is "true" when exception item is being saved', async () => {
    await act(async () => {
      const { result, rerender, waitForNextUpdate } = renderHook<
        PersistHookProps,
        ReturnPersistExceptionList
      >(() => usePersistExceptionList({ http: mockKibanaHttpService, onError }));
      await waitForNextUpdate();
      result.current[1](getCreateExceptionListSchemaMock());
      rerender();

      expect(result.current).toEqual([{ isLoading: true, isSaved: false }, result.current[1]]);
    });
  });

  test('"isSaved" is "true" when exception item saved successfully', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<
        PersistHookProps,
        ReturnPersistExceptionList
      >(() => usePersistExceptionList({ http: mockKibanaHttpService, onError }));
      await waitForNextUpdate();
      result.current[1](getCreateExceptionListSchemaMock());
      await waitForNextUpdate();

      expect(result.current).toEqual([{ isLoading: false, isSaved: true }, result.current[1]]);
    });
  });

  test('it invokes "updateExceptionList" when payload has "id"', async () => {
    const addException = jest.spyOn(api, 'addExceptionList');
    const updateException = jest.spyOn(api, 'updateExceptionList');
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<
        PersistHookProps,
        ReturnPersistExceptionList
      >(() => usePersistExceptionList({ http: mockKibanaHttpService, onError }));

      await waitForNextUpdate();
      result.current[1](getUpdateExceptionListSchemaMock());
      await waitForNextUpdate();

      expect(result.current).toEqual([{ isLoading: false, isSaved: true }, result.current[1]]);
      expect(addException).not.toHaveBeenCalled();
      expect(updateException).toHaveBeenCalled();
    });
  });

  test('"onError" callback is invoked and "isSaved" is "false" when api call fails', async () => {
    const error = new Error('persist rule failed');
    jest.spyOn(api, 'addExceptionList').mockRejectedValue(error);

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<
        PersistHookProps,
        ReturnPersistExceptionList
      >(() => usePersistExceptionList({ http: mockKibanaHttpService, onError }));
      await waitForNextUpdate();
      result.current[1](getCreateExceptionListSchemaMock());
      await waitForNextUpdate();

      expect(result.current).toEqual([{ isLoading: false, isSaved: false }, result.current[1]]);
      expect(onError).toHaveBeenCalledWith(error);
    });
  });
});
