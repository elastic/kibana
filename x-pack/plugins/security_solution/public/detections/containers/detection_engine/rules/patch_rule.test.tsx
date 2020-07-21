/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderHook, act } from '@testing-library/react-hooks';

import { usePatchRule, ReturnPatchRule } from './patch_rule';
import { patchRuleMock } from './mock';

jest.mock('./api');

describe('usePatchRule', () => {
  test('init', async () => {
    const { result } = renderHook<unknown, ReturnPatchRule>(() => usePatchRule());

    expect(result.current).toEqual([{ isLoading: false, isSaved: false }, result.current[1]]);
  });

  test('saving rule with isLoading === true', async () => {
    await act(async () => {
      const { result, rerender, waitForNextUpdate } = renderHook<void, ReturnPatchRule>(() =>
        usePatchRule()
      );
      await waitForNextUpdate();
      result.current[1](patchRuleMock);
      rerender();
      expect(result.current).toEqual([{ isLoading: true, isSaved: false }, result.current[1]]);
    });
  });

  test('saved rule with isSaved === true', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<void, ReturnPatchRule>(() => usePatchRule());
      await waitForNextUpdate();
      result.current[1](patchRuleMock);
      await waitForNextUpdate();
      expect(result.current).toEqual([{ isLoading: false, isSaved: true }, result.current[1]]);
    });
  });
});
