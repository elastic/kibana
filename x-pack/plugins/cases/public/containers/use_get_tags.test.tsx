/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { useGetTags, UseGetTags } from './use_get_tags';
import { tags } from './mock';
import * as api from './api';
import { TestProviders } from '../common/mock';
import { SECURITY_SOLUTION_OWNER } from '../../common/constants';

jest.mock('./api');
jest.mock('../common/lib/kibana');

describe('useGetTags', () => {
  const abortCtrl = new AbortController();
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('init', async () => {
    const { result } = renderHook<string, UseGetTags>(() => useGetTags(), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    await act(async () => {
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
      const { waitForNextUpdate } = renderHook<string, UseGetTags>(() => useGetTags(), {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      });
      await waitForNextUpdate();
      expect(spyOnGetTags).toBeCalledWith(abortCtrl.signal, [SECURITY_SOLUTION_OWNER]);
    });
  });

  it('fetch tags', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetTags>(() => useGetTags(), {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      });
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
      const { result, waitForNextUpdate } = renderHook<string, UseGetTags>(() => useGetTags(), {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      });
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
      const { result, waitForNextUpdate } = renderHook<string, UseGetTags>(() => useGetTags(), {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      });
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
