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

    expect(result.current.data.length).toEqual(0);
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

  it('returns jobs sorted by name', async () => {
    await act(async () => {
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

      mockNotableAnomaliesSearch.mockResolvedValue({
        aggregations: { number_of_anomalies: { buckets: [fistJobCount, secondJobCount] } },
      });

      mockUseSecurityJobs.mockReturnValue({
        loading: false,
        isMlAdmin: true,
        jobs: [firstJob, secondJob],
        refetch: useSecurityJobsRefetch,
      });

      const { result, waitForNextUpdate } = renderHook(
        () => useNotableAnomaliesSearch({ skip: false, from, to }),
        {
          wrapper: TestProviders,
        }
      );
      await waitForNextUpdate();
      await waitForNextUpdate();

      const names = result.current.data.map(({ name }) => name);
      expect(names).toEqual([
        firstJobSecurityName,
        secondJobSecurityName,
        'packetbeat_dns_tunneling',
        'packetbeat_rare_dns_question',
        'packetbeat_rare_server_domain',
        'suspicious_login_activity',
      ]);
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
});
