/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useLoadTags } from './use_load_tags';

const MOCK_TAGS = ['a', 'b', 'c'];

jest.mock('../lib/rule_api', () => ({
  loadRuleTags: jest.fn(),
}));

const { loadRuleTags } = jest.requireMock('../lib/rule_api');

const onError = jest.fn();

describe('useLoadTags', () => {
  beforeEach(() => {
    loadRuleTags.mockResolvedValue({
      ruleTags: MOCK_TAGS,
    });
    jest.clearAllMocks();
  });

  it('should call loadRuleTags API and handle result', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useLoadTags({ onError }));

    await act(async () => {
      result.current.loadTags();
      await waitForNextUpdate();
    });

    expect(loadRuleTags).toBeCalled();
    expect(result.current.tags).toEqual(MOCK_TAGS);
  });

  it('should call onError if API fails', async () => {
    loadRuleTags.mockRejectedValue('');

    const { result } = renderHook(() => useLoadTags({ onError }));

    await act(async () => {
      result.current.loadTags();
    });

    expect(loadRuleTags).toBeCalled();
    expect(onError).toBeCalled();
    expect(result.current.tags).toEqual([]);
  });
});
