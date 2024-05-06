/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { renderHook } from '@testing-library/react-hooks/dom';
import { waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useGetQueryDelaySettings } from './use_get_query_delay_settings';

jest.mock('../lib/rule_api/get_query_delay_settings', () => ({
  getQueryDelaySettings: jest.fn(),
}));

const { getQueryDelaySettings } = jest.requireMock('../lib/rule_api/get_query_delay_settings');
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

describe('useGetQueryDelaySettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call getQueryDelaySettings', async () => {
    renderHook(() => useGetQueryDelaySettings({ enabled: true, onSuccess: () => {} }), {
      wrapper,
    });

    await waitFor(() => {
      expect(getQueryDelaySettings).toHaveBeenCalled();
    });
  });

  it('should return isError = true if api fails', async () => {
    getQueryDelaySettings.mockRejectedValue('This is an error.');

    const { result } = renderHook(
      () => useGetQueryDelaySettings({ enabled: true, onSuccess: () => {} }),
      {
        wrapper,
      }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
