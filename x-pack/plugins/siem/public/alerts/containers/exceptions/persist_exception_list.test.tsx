/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderHook, act } from '@testing-library/react-hooks';

import { usePersistExceptionList, ReturnPersistExceptionList } from './persist_exception_list';
import { mockExceptionList } from './mock';

jest.mock('./api');

describe('usePersistExceptionList', () => {
  test('init', async () => {
    const { result } = renderHook<unknown, ReturnPersistExceptionList>(() =>
      usePersistExceptionList()
    );

    expect(result.current).toEqual([{ isLoading: false, isSaved: false }, result.current[1]]);
  });

  test('saving exception list with isLoading === true', async () => {
    await act(async () => {
      const { result, rerender, waitForNextUpdate } = renderHook<void, ReturnPersistExceptionList>(
        () => usePersistExceptionList()
      );
      await waitForNextUpdate();
      result.current[1](mockExceptionList);
      rerender();
      expect(result.current).toEqual([{ isLoading: true, isSaved: false }, result.current[1]]);
    });
  });

  test('saved exception list with isSaved === true', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<void, ReturnPersistExceptionList>(() =>
        usePersistExceptionList()
      );
      await waitForNextUpdate();
      result.current[1](mockExceptionList);
      await waitForNextUpdate();
      expect(result.current).toEqual([{ isLoading: false, isSaved: true }, result.current[1]]);
    });
  });
});
