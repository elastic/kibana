/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useServerlessServices, fetchUpsellingService } from './use_serverless_services';

describe('useServerlessServices', () => {
  let mockUseQuery;
  let queryClient;

  beforeEach(() => {
    queryClient = new QueryClient();

    mockUseQuery = jest.fn();
    jest.mock('@tanstack/react-query', () => ({
      ...jest.requireActual('@tanstack/react-query'), // Use the actual module implementation
      useQuery: mockUseQuery,
    }));
  });

  it('fetchUpsellingService should return valid UpsellingServiceInterface when securitySolution plugin is found', async () => {
    const mockPluginContractResolver = jest.fn().mockResolvedValue({
      securitySolution: {
        found: true,
        contract: {
          getUpselling: jest.fn().mockReturnValue({
            sections: new Map(),
            pages: new Map(),
            messages: new Map(),
          }),
        },
      },
    });

    const result = await fetchUpsellingService(mockPluginContractResolver);

    expect(result).toEqual({
      sections: new Map(),
      pages: new Map(),
      messages: new Map(),
    });
  });

  it('fetchUpsellingService should return undefined when securitySolution plugin is not found', async () => {
    const mockPluginContractResolver = jest.fn().mockResolvedValue({
      securitySolution: {
        found: false,
      },
    });

    const result = await fetchUpsellingService(mockPluginContractResolver);

    expect(result).toBeUndefined();
  });

  it('useServerlessServices should return undefined upsellingService when cloud.serverless.projectType is not defined', async () => {
    const mockUseKibana = jest.fn().mockReturnValue({
      services: {
        cloud: {},
        plugins: {
          onStart: jest.fn(),
        },
      },
    });

    const mockPluginsOnStart = jest.fn().mockResolvedValue({});

    jest.mock('./use_kibana', () => ({
      useKibana: mockUseKibana,
    }));

    const { result } = renderHook(() => useServerlessServices(mockPluginsOnStart), {
      wrapper: ({ children }) => {
        return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
      },
    });

    expect(result.current.upsellingService).toBeUndefined();
    expect(result.current.isServerless).toBe(false);
  });
});
