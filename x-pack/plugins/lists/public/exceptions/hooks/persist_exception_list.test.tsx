/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act, renderHook } from '@testing-library/react-hooks';

import { getExceptionListSchemaMock } from '../../../common/schemas/response/exception_list_schema.mock';
import { createKibanaCoreStartMock } from '../../common/mocks/kibana_core';

import { ReturnPersistExceptionList, usePersistExceptionList } from './persist_exception_list';

jest.mock('../api');

const mockKibanaHttpService = createKibanaCoreStartMock().http;

describe('usePersistExceptionList', () => {
  test('init', async () => {
    const onError = jest.fn();
    const { result } = renderHook<unknown, ReturnPersistExceptionList>(() =>
      usePersistExceptionList({ http: mockKibanaHttpService, onError })
    );

    expect(result.current).toEqual([{ isLoading: false, isSaved: false }, result.current[1]]);
  });

  test('saving exception list with isLoading === true', async () => {
    const onError = jest.fn();
    await act(async () => {
      const { result, rerender, waitForNextUpdate } = renderHook<void, ReturnPersistExceptionList>(
        () => usePersistExceptionList({ http: mockKibanaHttpService, onError })
      );
      await waitForNextUpdate();
      result.current[1](getExceptionListSchemaMock());
      rerender();
      expect(result.current).toEqual([{ isLoading: true, isSaved: false }, result.current[1]]);
    });
  });

  test('saved exception list with isSaved === true', async () => {
    const onError = jest.fn();
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<void, ReturnPersistExceptionList>(() =>
        usePersistExceptionList({ http: mockKibanaHttpService, onError })
      );
      await waitForNextUpdate();
      result.current[1](getExceptionListSchemaMock());
      await waitForNextUpdate();
      expect(result.current).toEqual([{ isLoading: false, isSaved: true }, result.current[1]]);
    });
  });
});
