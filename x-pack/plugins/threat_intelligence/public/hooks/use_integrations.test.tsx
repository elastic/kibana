/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { INSTALLATION_STATUS, THREAT_INTELLIGENCE_CATEGORY } from '../utils';

const createWrapper = () => {
  const queryClient = new QueryClient();
  return ({ children }: { children: any }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const renderUseQuery = (result: { items: any[] }) =>
  renderHook(() => useQuery(['integrations'], () => result), {
    wrapper: createWrapper(),
  });

describe('useIntegrations', () => {
  it('should have undefined data during loading state', async () => {
    const mockIntegrations = { items: [] };
    const { result, waitFor } = renderUseQuery(mockIntegrations);

    await waitFor(() => result.current.isLoading);

    expect(result.current.isLoading).toBeTruthy();
    expect(result.current.data).toBeUndefined();
  });

  it('should return integrations on success', async () => {
    const mockIntegrations = {
      items: [
        {
          categories: [THREAT_INTELLIGENCE_CATEGORY],
          id: '123',
          status: INSTALLATION_STATUS.Installed,
        },
      ],
    };
    const { result, waitFor } = renderUseQuery(mockIntegrations);

    await waitFor(() => result.current.isSuccess);

    expect(result.current.isLoading).toBeFalsy();
    expect(result.current.data).toEqual(mockIntegrations);
  });
});
