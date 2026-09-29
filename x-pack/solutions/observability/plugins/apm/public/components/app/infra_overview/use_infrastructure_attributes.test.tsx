/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { renderHook } from '@testing-library/react';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { useInfrastructureAttributes } from './use_infrastructure_attributes';

vi.mock('../../../context/apm_service/use_apm_service_context', () => {
  const mocked = {
    useApmServiceContext: () => ({
      agentName: 'nodejs',
      serviceName: 'opbeans-node',
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../hooks/use_apm_params', () => {
  const mocked = {
    useApmParams: () => ({
      query: {
        detailTab: undefined,
        environment: 'ENVIRONMENT_ALL',
        kuery: '',
        rangeFrom: 'now-15m',
        rangeTo: 'now',
      },
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../hooks/use_fetcher', async () => {
  const actual = await vi.importActual('../../../hooks/use_fetcher');

  return {
    ...actual,
    useFetcher: vi.fn(),
  };
});

vi.mock('../../../hooks/use_time_range', () => {
  const mocked = {
    useTimeRange: () => ({
      end: '2021-10-10T00:15:00.000Z',
      start: '2021-10-10T00:00:00.000Z',
    }),
  };
  return { ...mocked, default: mocked };
});

const mockUseFetcher = useFetcher as Mock;

describe('useInfrastructureAttributes', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns infrastructure attributes from the fetcher response', () => {
    mockUseFetcher.mockReturnValue({
      data: {
        containerIds: [],
        hostNames: ['host-1'],
        podNames: [],
      },
      status: FETCH_STATUS.SUCCESS,
    });

    const { result } = renderHook(() => useInfrastructureAttributes());

    expect(result.current.data.hostNames).toEqual(['host-1']);
    expect(result.current.status).toBe(FETCH_STATUS.SUCCESS);
  });

  it('returns empty infrastructure attributes from the fetcher response', () => {
    mockUseFetcher.mockReturnValue({
      data: {
        containerIds: [],
        hostNames: [],
        podNames: [],
      },
      status: FETCH_STATUS.SUCCESS,
    });

    const { result } = renderHook(() => useInfrastructureAttributes());

    expect(result.current.data).toEqual({
      containerIds: [],
      hostNames: [],
      podNames: [],
    });
  });
});
