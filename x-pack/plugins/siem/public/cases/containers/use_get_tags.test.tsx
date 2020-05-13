/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useGetTags, UseGetTags } from './use_get_tags';
import { tags } from './mock';
import * as api from './api';

jest.mock('./api');

describe('useGetTags', () => {
  const abortCtrl = new AbortController();
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('init', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetTags>(() => useGetTags());
      await waitForNextUpdate();
      expect(result.current).toEqual({
        tags: [],
        isLoading: true,
        isError: false,
        fetchTags: result.current.fetchTags,
      });
    });
  });

  it('calls getTags api', async () => {
    const spyOnGetTags = jest.spyOn(api, 'getTags');
    await act(async () => {
      const { waitForNextUpdate } = renderHook<string, UseGetTags>(() => useGetTags());
      await waitForNextUpdate();
      await waitForNextUpdate();
      expect(spyOnGetTags).toBeCalledWith(abortCtrl.signal);
    });
  });

  it('fetch tags', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetTags>(() => useGetTags());
      await waitForNextUpdate();
      await waitForNextUpdate();
      expect(result.current).toEqual({
        tags,
        isLoading: false,
        isError: false,
        fetchTags: result.current.fetchTags,
      });
    });
  });

  it('refetch tags', async () => {
    const spyOnGetTags = jest.spyOn(api, 'getTags');
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetTags>(() => useGetTags());
      await waitForNextUpdate();
      await waitForNextUpdate();
      result.current.fetchTags();
      expect(spyOnGetTags).toHaveBeenCalledTimes(2);
    });
  });

  it('unhappy path', async () => {
    const spyOnGetTags = jest.spyOn(api, 'getTags');
    spyOnGetTags.mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetTags>(() => useGetTags());
      await waitForNextUpdate();
      await waitForNextUpdate();

      expect(result.current).toEqual({
        tags: [],
        isLoading: false,
        isError: true,
        fetchTags: result.current.fetchTags,
      });
    });
  });
});
