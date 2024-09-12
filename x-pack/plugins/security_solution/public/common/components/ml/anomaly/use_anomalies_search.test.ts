/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { TestProviders } from '../../../mock';
import { useAggregatedAnomaliesByJob, AnomalyEntity } from './use_anomalies_search';

const jobId = 'auth_rare_source_ip_for_a_user';
const from = 'now-24h';
const to = 'now';
const job = { id: jobId, jobState: 'started', datafeedState: 'started' };
const JOBS = [job];
const useSecurityJobsRefetch = jest.fn();

const mockUseSecurityJobs = jest.fn().mockReturnValue({
  loading: false,
  isMlAdmin: true,
  jobs: JOBS,
  refetch: useSecurityJobsRefetch,
});

jest.mock('../../ml_popover/hooks/use_security_jobs', () => ({
  useSecurityJobs: () => mockUseSecurityJobs(),
}));

const mockAddToastError = jest.fn();
jest.mock('../../../hooks/use_app_toasts', () => ({
  useAppToasts: jest.fn(() => ({
    addError: mockAddToastError,
  })),
}));

const mockAnomaliesSearch = jest.fn().mockResolvedValue({});
jest.mock('../api/anomalies_search', () => ({
  anomaliesSearch: jest.fn().mockImplementation((params: unknown) => mockAnomaliesSearch(params)),
}));

describe('useAggregatedAnomaliesByJob', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the initial value', () => {
    const { result } = renderHook(() => useAggregatedAnomaliesByJob({ skip: true, from, to }), {
      wrapper: TestProviders,
    });

    expect(result.current.data.length).toEqual(0);
  });

  it('calls anomaliesSearch when skip is false', async () => {
    await act(async () => {
      renderHook(() => useAggregatedAnomaliesByJob({ skip: false, from, to }), {
        wrapper: TestProviders,
      });
    });
    expect(mockAnomaliesSearch).toHaveBeenCalled();
  });

  it('does NOT call anomaliesSearch when skip is true', async () => {
    await act(async () => {
      renderHook(() => useAggregatedAnomaliesByJob({ skip: true, from, to }), {
        wrapper: TestProviders,
      });
    });
    expect(mockAnomaliesSearch).not.toHaveBeenCalled();
  });

  it('refetch calls useSecurityJobs().refetch', async () => {
    const { result } = renderHook(() => useAggregatedAnomaliesByJob({ skip: false, from, to }), {
      wrapper: TestProviders,
    });

    await waitFor(() => null);

    act(() => {
      result.current.refetch();
    });

    expect(useSecurityJobsRefetch).toHaveBeenCalled();
  });

  it('returns formated data', async () => {
    const jobCount = { key: jobId, doc_count: 99 };
    mockAnomaliesSearch.mockResolvedValue({
      aggregations: { number_of_anomalies: { buckets: [jobCount] } },
    });
    const { result } = renderHook(() => useAggregatedAnomaliesByJob({ skip: false, from, to }), {
      wrapper: TestProviders,
    });

    await waitFor(() => null);

    expect(result.current.data).toEqual(
      expect.arrayContaining([
        {
          count: 99,
          name: jobId,
          job,
          entity: AnomalyEntity.Host,
        },
      ])
    );
  });

  it('returns jobs sorted by name', async () => {
    const firstJobId = 'v3_windows_anomalous_script';
    const secondJobId = 'auth_rare_source_ip_for_a_user';
    const fistJobCount = { key: firstJobId, doc_count: 99 };
    const secondJobCount = { key: secondJobId, doc_count: 99 };
    const firstJobSecurityName = '0000001';
    const secondJobSecurityName = '0000002';
    const firstJob = {
      id: firstJobId,
      jobState: 'started',
      datafeedState: 'started',
      customSettings: {
        security_app_display_name: firstJobSecurityName,
      },
    };
    const secondJob = {
      id: secondJobId,
      jobState: 'started',
      datafeedState: 'started',
      customSettings: {
        security_app_display_name: secondJobSecurityName,
      },
    };

    mockAnomaliesSearch.mockResolvedValue({
      aggregations: { number_of_anomalies: { buckets: [fistJobCount, secondJobCount] } },
    });

    mockUseSecurityJobs.mockReturnValue({
      loading: false,
      isMlAdmin: true,
      jobs: [firstJob, secondJob],
      refetch: useSecurityJobsRefetch,
    });

    const { result } = renderHook(() => useAggregatedAnomaliesByJob({ skip: false, from, to }), {
      wrapper: TestProviders,
    });
    await waitFor(() => null);

    const names = result.current.data.map(({ name }) => name);

    expect(names[0]).toEqual(firstJobSecurityName);
    expect(names[1]).toEqual(secondJobSecurityName);
  });

  it('does not throw error when aggregations is undefined', async () => {
    mockAnomaliesSearch.mockResolvedValue({});
    renderHook(() => useAggregatedAnomaliesByJob({ skip: false, from, to }), {
      wrapper: TestProviders,
    });

    await waitFor(() => null);

    expect(mockAddToastError).not.toBeCalled();
  });
});
