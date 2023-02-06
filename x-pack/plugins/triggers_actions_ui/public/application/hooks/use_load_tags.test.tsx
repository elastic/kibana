/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { renderHook } from '@testing-library/react-hooks/dom';
import { useLoadTagsQuery as useLoadTags } from './use_load_tags_query';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useKibana } from '../../common/lib/kibana';
import { IToasts } from '@kbn/core-notifications-browser';
import { waitFor } from '@testing-library/dom';

const MOCK_TAGS = ['a', 'b', 'c'];

jest.mock('../../common/lib/kibana');
jest.mock('../lib/rule_api', () => ({
  loadRuleTags: jest.fn(),
}));

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
const { loadRuleTags } = jest.requireMock('../lib/rule_api');

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

describe('useLoadTags', () => {
  beforeEach(() => {
    useKibanaMock().services.notifications.toasts = {
      addDanger: jest.fn(),
    } as unknown as IToasts;
    loadRuleTags.mockResolvedValue({
      ruleTags: MOCK_TAGS,
    });
  });

  afterEach(() => {
    queryClient.clear();
    jest.clearAllMocks();
  });

  it('should call loadRuleTags API and handle result', async () => {
    const { rerender, result, waitForNextUpdate } = renderHook(
      () => useLoadTags({ enabled: true }),
      {
        wrapper,
      }
    );

    rerender();
    await waitForNextUpdate();

    expect(loadRuleTags).toBeCalled();
    expect(result.current.tags).toEqual(MOCK_TAGS);
  });

  it('should call onError if API fails', async () => {
    loadRuleTags.mockRejectedValue('');

    const { result } = renderHook(() => useLoadTags({ enabled: true }), { wrapper });

    expect(loadRuleTags).toBeCalled();
    expect(result.current.tags).toEqual([]);
    await waitFor(() =>
      expect(useKibanaMock().services.notifications.toasts.addDanger).toBeCalled()
    );
  });
});
