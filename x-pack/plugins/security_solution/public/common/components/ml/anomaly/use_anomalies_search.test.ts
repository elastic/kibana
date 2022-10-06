/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
// import React from 'react';
import type { RenderResult } from '@testing-library/react-hooks';
import { act, renderHook } from '@testing-library/react-hooks';
import { TestProviders } from '../../../mock';
import type { Refetch } from '../../../store/inputs/model';
import type { SecurityJob } from '../../ml_popover/types';
import type { AnomaliesCount } from './use_anomalies_search';
import { useNotableAnomaliesSearch, AnomalyEntity } from './use_anomalies_search';

const jobId = 'auth_rare_source_ip_for_a_user';
const from = 'now-24h';
const to = 'now';
const JOBS = [{ id: jobId, jobState: 'started', datafeedState: 'started' }];

const mockuseInstalledSecurityJobs = jest.fn().mockReturnValue({
  loading: false,
  isMlUser: true,
  jobs: JOBS,
});

jest.mock('../hooks/use_installed_security_jobs', () => ({
  useInstalledSecurityJobs: () => mockuseInstalledSecurityJobs(),
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

  it('refetch calls notableAnomaliesSearch', async () => {
    let renderResult: RenderResult<{
      isLoading: boolean;
      data: AnomaliesCount[];
      refetch: Refetch;
    }>;

    // first notableAnomaliesSearch call
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(
        () => useNotableAnomaliesSearch({ skip: false, from, to }),
        {
          wrapper: TestProviders,
        }
      );
      renderResult = result;

      await waitForNextUpdate();
    });

    await act(async () => {
      mockNotableAnomaliesSearch.mockClear(); // clear the first notableAnomaliesSearch call
      await renderResult.current.refetch();
    });

    expect(mockNotableAnomaliesSearch).toHaveBeenCalled();
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
            job: {
              isInstalled: true,
              datafeedState: 'started',
              jobState: 'opened',
              isCompatible: true,
            } as SecurityJob,
            entity: AnomalyEntity.Host,
          },
        ])
      );
    });
  });

  it('returns uninstalled jobs', async () => {
    mockuseInstalledSecurityJobs.mockReturnValue({
      loading: false,
      isMlUser: true,
      jobs: [],
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
            job: {
              isInstalled: false,
            } as SecurityJob,
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
    mockuseInstalledSecurityJobs.mockReturnValue({
      loading: false,
      isMlUser: true,
      jobs: [
        {
          id: customJobId,
          jobState: 'started',
          datafeedState: 'started',
        },
      ],
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
            // jobId: customJobId,
            name: jobId,
            job: {
              isInstalled: true,
            } as SecurityJob,
            entity: AnomalyEntity.Host,
          },
        ])
      );
    });
  });

  it('returns the most recent job when there are multiple jobs matching one notable job id`', async () => {
    const mostRecentJobId = `mostRecent_${jobId}`;
    const leastRecentJobId = `leastRecent_${jobId}`;

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

    mockuseInstalledSecurityJobs.mockReturnValue({
      loading: false,
      isMlUser: true,
      jobs: [
        {
          id: leastRecentJobId,
          jobState: 'started',
          datafeedState: 'started',
          latestTimestampSortValue: 1661644800000, // 2022-08-28
        },
        {
          id: mostRecentJobId,
          jobState: 'started',
          datafeedState: 'started',
          latestTimestampSortValue: 1661731200000, // 2022-08-29
        },
      ],
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
            // jobId: mostRecentJobId,
            name: jobId,
            job: {
              isInstalled: false,
            } as SecurityJob,
            entity: AnomalyEntity.Host,
          },
        ])
      );
    });
  });
});
