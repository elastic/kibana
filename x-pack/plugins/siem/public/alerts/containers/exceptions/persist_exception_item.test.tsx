/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderHook, act } from '@testing-library/react-hooks';

import { usePersistExceptionItem, ReturnPersistExceptionItem } from './persist_exception_item';
import { mockExceptionItem } from './mock';

jest.mock('./api');

describe('usePersistExceptionItem', () => {
  test('init', async () => {
    const { result } = renderHook<unknown, ReturnPersistExceptionItem>(() =>
      usePersistExceptionItem()
    );

    expect(result.current).toEqual([{ isLoading: false, isSaved: false }, result.current[1]]);
  });

  test('saving exception item with isLoading === true', async () => {
    await act(async () => {
      const { result, rerender, waitForNextUpdate } = renderHook<void, ReturnPersistExceptionItem>(
        () => usePersistExceptionItem()
      );
      await waitForNextUpdate();
      result.current[1](mockExceptionItem);
      rerender();
      expect(result.current).toEqual([{ isLoading: true, isSaved: false }, result.current[1]]);
    });
  });

  test('saved exception item with isSaved === true', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<void, ReturnPersistExceptionItem>(() =>
        usePersistExceptionItem()
      );
      await waitForNextUpdate();
      result.current[1](mockExceptionItem);
      await waitForNextUpdate();
      expect(result.current).toEqual([{ isLoading: false, isSaved: true }, result.current[1]]);
    });
  });
});
