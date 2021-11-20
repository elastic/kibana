/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useAppToastsMock } from '../../../../common/hooks/use_app_toasts.mock';
import { useTags, ReturnTags } from './use_tags';

jest.mock('./api');
jest.mock('../../../../common/hooks/use_app_toasts');

describe('useTags', () => {
  (useAppToasts as jest.Mock).mockReturnValue(useAppToastsMock.create());

  beforeEach(() => {
    jest.clearAllMocks();
  });

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
