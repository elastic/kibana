/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import * as ReactQuery from '@tanstack/react-query';
import { waitFor, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpServiceMock, notificationServiceMock } from '@kbn/core/public/mocks';
import { useProviders } from './get_providers';

const http = httpServiceMock.createStartContract();
const toasts = notificationServiceMock.createStartContract();
const useQuerySpy = jest.spyOn(ReactQuery, 'useQuery');

beforeEach(() => jest.resetAllMocks());

const { getProviders } = jest.requireMock('./get_providers');

const queryClient = new QueryClient();

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('useProviders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call useQuery', async () => {
    renderHook(() => useProviders(http, toasts.toasts), {
      wrapper,
    });

    await waitFor(() => {
      return expect(useQuerySpy).toBeCalled();
    });
  });

  it('should return isError = true if api fails', async () => {
    getProviders.mockResolvedValue('This is an error.');

    renderHook(() => useProviders(http, toasts.toasts), {
      wrapper,
    });

    await waitFor(() => expect(useQuerySpy).toHaveBeenCalled());
  });
});
