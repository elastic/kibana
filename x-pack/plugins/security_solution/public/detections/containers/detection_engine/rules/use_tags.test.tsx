/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useAppToastsMock } from '../../../../common/hooks/use_app_toasts.mock';
import type { ReturnTags } from './use_tags';
import { useTags } from './use_tags';

jest.mock('./api');
jest.mock('../../../../common/hooks/use_app_toasts');

describe('useTags', () => {
  (useAppToasts as jest.Mock).mockReturnValue(useAppToastsMock.create());

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('init', async () => {
    await act(async () => {
      const { result } = renderHook<ReturnTags, {}>(() => useTags());
      await waitFor(() => {
        expect(result.current).toEqual([true, [], result.current[2]]);
      });
    });
  });

  test('fetch tags', async () => {
    await act(async () => {
      const { result } = renderHook<ReturnTags, {}>(() => useTags());
      await waitFor(() => {
        expect(result.current).toEqual([
          false,
          ['elastic', 'love', 'quality', 'code'],
          result.current[2],
        ]);
      });
    });
  });
});
