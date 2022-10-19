/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { act, renderHook } from '@testing-library/react-hooks';
import { TestProviders } from '../../../mock';
import { useNotableAnomaliesSearch, AnomalyEntity } from './use_anomalies_search';

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

const mockNotableAnomaliesSearch = jest.fn().mockResolvedValue({});
jest.mock('../api/anomalies_search', () => ({
  notableAnomaliesSearch: jest
    .fn()
    .mockImplementation((params: unknown) => mockNotableAnomaliesSearch(params)),
}));

describe('useNotableAnomaliesSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the initial value', () => {
    const { result } = renderHook(() => useNotableAnomaliesSearch({ skip: true, from, to }), {
      wrapper: TestProviders,
    });

    expect(result.current.data.length).toEqual(6);
  });

  it('calls notableAnomaliesSearch when skip is false', async () => {
    await act(async () => {
      renderHook(() => useNotableAnomaliesSearch({ skip: false, from, to }), {
        wrapper: TestProviders,
      });
    });
    expect(mockNotableAnomaliesSearch).toHaveBeenCalled();
  });

  it('does NOT call notableAnomaliesSearch when skip is true', async () => {
    await act(async () => {
      renderHook(() => useNotableAnomaliesSearch({ skip: true, from, to }), {
        wrapper: TestProviders,
      });
    });
    expect(mockNotableAnomaliesSearch).not.toHaveBeenCalled();
  });

  it('refetch calls useSecurityJobs().refetch', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(
        () => useNotableAnomaliesSearch({ skip: false, from, to }),
        {
          wrapper: TestProviders,
        }
      );

      await waitForNextUpdate();

      result.current.refetch();
    });

    expect(useSecurityJobsRefetch).toHaveBeenCalled();
  });

  it('returns formated data', async () => {
    await act(async () => {
      const jobCount = { key: jobId, doc_count: 99 };
      mockNotableAnomaliesSearch.mockResolvedValue({
        aggregations: { number_of_anomalies: { buckets: [jobCount] } },
      });
      const { result, waitForNextUpdate } = renderHook(
        () => useNotableAnomaliesSearch({ skip: false, from, to }),
        {
          wrapper: TestProviders,
        }
      );
      await waitForNextUpdate();
      await waitForNextUpdate();

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
  });

  it('does not throw error when aggregations is undefined', async () => {
    await act(async () => {
      mockNotableAnomaliesSearch.mockResolvedValue({});
      const { waitForNextUpdate } = renderHook(
        () => useNotableAnomaliesSearch({ skip: false, from, to }),
        {
          wrapper: TestProviders,
        }
      );
      await waitForNextUpdate();
      await waitForNextUpdate();

      expect(mockAddToastError).not.toBeCalled();
    });
  });

  it('returns uninstalled jobs', async () => {
    mockUseSecurityJobs.mockReturnValue({
      loading: false,
      isMlAdmin: true,
      jobs: [],
      refetch: useSecurityJobsRefetch,
    });

    await act(async () => {
      mockNotableAnomaliesSearch.mockResolvedValue({
        aggregations: { number_of_anomalies: { buckets: [] } },
      });
      const { result, waitForNextUpdate } = renderHook(
        () => useNotableAnomaliesSearch({ skip: false, from, to }),
        {
          wrapper: TestProviders,
        }
      );
      await waitForNextUpdate();
      await waitForNextUpdate();

      expect(result.current.data).toEqual(
        expect.arrayContaining([
          {
            count: 0,
            name: job.id,
            job: undefined,
            entity: AnomalyEntity.Host,
          },
        ])
      );
    });
  });

  it('returns jobs with custom job ids', async () => {
    const customJobId = `test_${jobId}`;
    const jobCount = { key: customJobId, doc_count: 99 };
    mockNotableAnomaliesSearch.mockResolvedValue({
      aggregations: { number_of_anomalies: { buckets: [jobCount] } },
    });

    const customJob = {
      id: customJobId,
      jobState: 'started',
      datafeedState: 'started',
    };

    mockUseSecurityJobs.mockReturnValue({
      loading: false,
      isMlAdmin: true,
      jobs: [customJob],
      refetch: useSecurityJobsRefetch,
    });

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(
        () => useNotableAnomaliesSearch({ skip: false, from, to }),
        {
          wrapper: TestProviders,
        }
      );

      await waitForNextUpdate();
      await waitForNextUpdate();

      expect(result.current.data).toEqual(
        expect.arrayContaining([
          {
            count: 99,
            name: job.id,
            job: customJob,
            entity: AnomalyEntity.Host,
          },
        ])
      );
    });
  });

  it('returns the most recent job when there are multiple jobs matching one notable job id`', async () => {
    const mostRecentJobId = `mostRecent_${jobId}`;
    const leastRecentJobId = `leastRecent_${jobId}`;
    const mostRecentJob = {
      id: mostRecentJobId,
      jobState: 'started',
      datafeedState: 'started',
      latestTimestampSortValue: 1661731200000, // 2022-08-29
    };

    mockNotableAnomaliesSearch.mockResolvedValue({
      aggregations: {
        number_of_anomalies: {
          buckets: [
            { key: mostRecentJobId, doc_count: 99 },
            { key: leastRecentJobId, doc_count: 10 },
          ],
        },
      },
    });

    mockUseSecurityJobs.mockReturnValue({
      loading: false,
      isMlAdmin: true,
      jobs: [
        {
          id: leastRecentJobId,
          jobState: 'started',
          datafeedState: 'started',
          latestTimestampSortValue: 1661644800000, // 2022-08-28
        },
        mostRecentJob,
      ],
      refetch: useSecurityJobsRefetch,
    });

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(
        () => useNotableAnomaliesSearch({ skip: false, from, to }),
        {
          wrapper: TestProviders,
        }
      );
      await waitForNextUpdate();
      await waitForNextUpdate();

      expect(result.current.data).toEqual(
        expect.arrayContaining([
          {
            count: 99,
            name: jobId,
            job: mostRecentJob,
            entity: AnomalyEntity.Host,
          },
        ])
      );
    });
  });
});
