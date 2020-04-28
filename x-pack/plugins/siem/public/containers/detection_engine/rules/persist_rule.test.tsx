/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderHook, act } from '@testing-library/react-hooks';

import { usePersistRule, ReturnPersistRule } from './persist_rule';
import { ruleMock } from './mock';

jest.mock('./api');

describe('usePersistRule', () => {
  test('init', async () => {
    const { result } = renderHook<unknown, ReturnPersistRule>(() => usePersistRule());

    expect(result.current).toEqual([{ isLoading: false, isSaved: false }, result.current[1]]);
  });

  test('saving rule with isLoading === true', async () => {
    await act(async () => {
      const { result, rerender, waitForNextUpdate } = renderHook<void, ReturnPersistRule>(() =>
        usePersistRule()
      );
      await waitForNextUpdate();
      result.current[1](ruleMock);
      rerender();
      expect(result.current).toEqual([{ isLoading: true, isSaved: false }, result.current[1]]);
    });
  });

  test('saved rule with isSaved === true', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<void, ReturnPersistRule>(() =>
        usePersistRule()
      );
      await waitForNextUpdate();
      result.current[1](ruleMock);
      await waitForNextUpdate();
      expect(result.current).toEqual([{ isLoading: false, isSaved: true }, result.current[1]]);
    });
  });
});
