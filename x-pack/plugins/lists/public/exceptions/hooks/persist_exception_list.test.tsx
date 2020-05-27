/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act, renderHook } from '@testing-library/react-hooks';

import { mockExceptionList } from '../mock';
import { createKibanaCoreStartMock } from '../../common/mocks/kibana_core';
import { PersistHookProps } from '../types';

import { ReturnPersistExceptionList, usePersistExceptionList } from './persist_exception_list';

jest.mock('../api');

const mockKibanaHttpService = createKibanaCoreStartMock().http;

describe('usePersistExceptionList', () => {
  test('init', async () => {
    const onError = jest.fn();
    const { result } = renderHook<PersistHookProps, ReturnPersistExceptionList>(() =>
      usePersistExceptionList({ http: mockKibanaHttpService, onError })
    );

    expect(result.current).toEqual([{ isLoading: false, isSaved: false }, result.current[1]]);
  });

  test('saving exception list with isLoading === true', async () => {
    const onError = jest.fn();
    await act(async () => {
      const { result, rerender, waitForNextUpdate } = renderHook<
        PersistHookProps,
        ReturnPersistExceptionList
      >(() => usePersistExceptionList({ http: mockKibanaHttpService, onError }));
      await waitForNextUpdate();
      result.current[1](mockExceptionList);
      rerender();
      expect(result.current).toEqual([{ isLoading: true, isSaved: false }, result.current[1]]);
    });
  });

  test('saved exception list with isSaved === true', async () => {
    const onError = jest.fn();
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<
        PersistHookProps,
        ReturnPersistExceptionList
      >(() => usePersistExceptionList({ http: mockKibanaHttpService, onError }));
      await waitForNextUpdate();
      result.current[1](mockExceptionList);
      await waitForNextUpdate();
      expect(result.current).toEqual([{ isLoading: false, isSaved: true }, result.current[1]]);
    });
  });
});
