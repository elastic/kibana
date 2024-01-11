/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { renderHook } from '@testing-library/react-hooks/dom';
import { useLoadTagsQuery } from './use_load_tags_query';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useKibana } from '../../common/lib/kibana';
import { IToasts } from '@kbn/core-notifications-browser';
import { waitFor } from '@testing-library/react';

const MOCK_TAGS = ['a', 'b', 'c'];

jest.mock('../../common/lib/kibana');
jest.mock('../lib/rule_api/aggregate', () => ({
  loadRuleTags: jest.fn(),
}));

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
const { loadRuleTags } = jest.requireMock('../lib/rule_api/aggregate');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      cacheTime: 0,
    },
  },
});
const wrapper = ({ children }: { children: Node }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('useLoadTagsQuery', () => {
  beforeEach(() => {
    useKibanaMock().services.notifications.toasts = {
      addDanger: jest.fn(),
    } as unknown as IToasts;
    loadRuleTags.mockResolvedValue({
      data: MOCK_TAGS,
      page: 1,
      perPage: 50,
      total: MOCK_TAGS.length,
    });
  });

  afterEach(() => {
    queryClient.clear();
    jest.clearAllMocks();
  });

  it('should call loadRuleTags API and handle result', async () => {
    const { rerender, result, waitForNextUpdate } = renderHook(
      () =>
        useLoadTagsQuery({
          enabled: true,
          search: 'test',
          perPage: 50,
          page: 1,
        }),
      {
        wrapper,
      }
    );

    rerender();
    await waitForNextUpdate();

    expect(loadRuleTags).toHaveBeenLastCalledWith(
      expect.objectContaining({
        search: 'test',
        perPage: 50,
        page: 1,
      })
    );

    expect(result.current.tags).toEqual(MOCK_TAGS);
    expect(result.current.hasNextPage).toEqual(false);
  });

  it('should support pagination', async () => {
    loadRuleTags.mockResolvedValue({
      data: ['a', 'b', 'c', 'd', 'e'],
      page: 1,
      perPage: 5,
      total: 10,
    });
    const { rerender, result, waitForNextUpdate } = renderHook(
      () =>
        useLoadTagsQuery({
          enabled: true,
          perPage: 5,
          page: 1,
        }),
      {
        wrapper,
      }
    );

    rerender();
    await waitForNextUpdate();

    expect(loadRuleTags).toHaveBeenLastCalledWith(
      expect.objectContaining({
        perPage: 5,
        page: 1,
      })
    );

    expect(result.current.tags).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(result.current.hasNextPage).toEqual(true);

    loadRuleTags.mockResolvedValue({
      data: ['a', 'b', 'c', 'd', 'e'],
      page: 2,
      perPage: 5,
      total: 10,
    });
    result.current.fetchNextPage();

    expect(loadRuleTags).toHaveBeenLastCalledWith(
      expect.objectContaining({
        perPage: 5,
        page: 2,
      })
    );

    rerender();
    await waitForNextUpdate();

    expect(result.current.hasNextPage).toEqual(false);
  });

  it('should support pagination when there are no tags', async () => {
    loadRuleTags.mockResolvedValue({
      data: [],
      page: 1,
      perPage: 5,
      total: 0,
    });

    const { rerender, result, waitForNextUpdate } = renderHook(
      () =>
        useLoadTagsQuery({
          enabled: true,
          perPage: 5,
          page: 1,
        }),
      {
        wrapper,
      }
    );

    rerender();
    await waitForNextUpdate();

    expect(loadRuleTags).toHaveBeenLastCalledWith(
      expect.objectContaining({
        perPage: 5,
        page: 1,
      })
    );

    expect(result.current.tags).toEqual([]);
    expect(result.current.hasNextPage).toEqual(false);
  });

  it('should call onError if API fails', async () => {
    loadRuleTags.mockRejectedValue('');

    const { result } = renderHook(() => useLoadTagsQuery({ enabled: true }), { wrapper });

    expect(loadRuleTags).toBeCalled();
    expect(result.current.tags).toEqual([]);
    await waitFor(() =>
      expect(useKibanaMock().services.notifications.toasts.addDanger).toBeCalled()
    );
  });
});
