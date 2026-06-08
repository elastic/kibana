/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { useInfrastructureAttributes } from './use_infrastructure_attributes';

jest.mock('../../../context/apm_service/use_apm_service_context', () => ({
  useApmServiceContext: () => ({
    agentName: 'nodejs',
    serviceName: 'opbeans-node',
  }),
}));

jest.mock('../../../hooks/use_apm_params', () => ({
  useApmParams: () => ({
    query: {
      detailTab: undefined,
      environment: 'ENVIRONMENT_ALL',
      kuery: '',
      rangeFrom: 'now-15m',
      rangeTo: 'now',
    },
  }),
}));

jest.mock('../../../hooks/use_fetcher', () => {
  const actual = jest.requireActual('../../../hooks/use_fetcher');

  return {
    ...actual,
    useFetcher: jest.fn(),
  };
});

jest.mock('../../../hooks/use_time_range', () => ({
  useTimeRange: () => ({
    end: '2021-10-10T00:15:00.000Z',
    start: '2021-10-10T00:00:00.000Z',
  }),
}));

const mockUseFetcher = useFetcher as jest.Mock;

describe('useInfrastructureAttributes', () => {
  afterEach(() => {
    jest.clearAllMocks();
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
