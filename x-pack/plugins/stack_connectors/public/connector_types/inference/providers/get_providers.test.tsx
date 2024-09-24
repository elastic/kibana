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
import { httpServiceMock, notificationServiceMock } from '@kbn/core/public/mocks';
import { useProviders } from './get_providers';

const http = httpServiceMock.createStartContract();
const toasts = notificationServiceMock.createStartContract();

beforeEach(() => jest.resetAllMocks());

const { getProviders } = jest.requireMock('./get_providers');
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

describe('useProviders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call getProviders', async () => {
    renderHook(() => useProviders(http, toasts.toasts), {
      wrapper,
    });

    await waitFor(() => {
      expect(getProviders).toHaveBeenCalled();
    });
  });

  it('should return isError = true if api fails', async () => {
    getProviders.mockRejectedValue('This is an error.');

    const { result } = renderHook(() => useProviders(http, toasts.toasts), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
