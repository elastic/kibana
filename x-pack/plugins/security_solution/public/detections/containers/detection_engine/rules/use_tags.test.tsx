/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useTags, ReturnTags } from './use_tags';

jest.mock('./api');

describe('useTags', () => {
  test('init', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<void, ReturnTags>(() => useTags());
      await waitForNextUpdate();
      expect(result.current).toEqual([true, [], result.current[2]]);
    });
  });

  test('fetch tags', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<void, ReturnTags>(() => useTags());
      await waitForNextUpdate();
      await waitForNextUpdate();
      expect(result.current).toEqual([
        false,
        ['elastic', 'love', 'quality', 'code'],
        result.current[2],
      ]);
    });
  });
});
