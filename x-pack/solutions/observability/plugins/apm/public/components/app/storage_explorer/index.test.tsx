/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { StorageExplorer } from '.';
import { MockApmPluginContextWrapper } from '../../../context/apm_plugin/mock_apm_plugin_context';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { IndexLifecyclePhaseSelectOption } from '../../../../common/storage_explorer_types';

// Mock the hooks
const mockUseFetcher = vi.fn();
const mockUseProgressiveFetcher = vi.fn();
const mockUseApmParams = vi.fn();
const mockUseTimeRange = vi.fn();
const mockUseLocalStorage = vi.fn();

vi.mock('../../../hooks/use_fetcher', () => {
      const mocked = {
      useFetcher: () => mockUseFetcher(),
      FETCH_STATUS: {
        LOADING: 'loading',
        SUCCESS: 'success',
        FAILURE: 'failure',
        NOT_INITIATED: 'not_initiated',
      },
      isPending: vi.fn((status) => status === 'loading'),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../hooks/use_progressive_fetcher', () => {
      const mocked = {
      useProgressiveFetcher: () => mockUseProgressiveFetcher(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../hooks/use_apm_params', () => {
      const mocked = {
      useApmParams: () => mockUseApmParams(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../hooks/use_time_range', () => {
      const mocked = {
      useTimeRange: () => mockUseTimeRange(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../hooks/use_local_storage', () => {
      const mocked = {
      useLocalStorage: () => mockUseLocalStorage(),
    };
      return { ...mocked, default: mocked };
    });

// Mock child components
vi.mock('../../shared/environment_filter', () => {
      const mocked = {
      ApmEnvironmentFilter: () => <div data-test-subj="environment-filter">Environment Filter</div>,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./index_lifecycle_phase_select', () => {
      const mocked = {
      IndexLifecyclePhaseSelect: () => (
        <div data-test-subj="lifecycle-phase-select">Lifecycle Phase Select</div>
      ),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./summary_stats', () => {
      const mocked = {
      SummaryStats: ({ summaryStatsData }: { summaryStatsData: any }) => (
        <div data-test-subj="summary-stats">
          Summary Stats: {summaryStatsData ? 'with data' : 'no data'}
        </div>
      ),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./storage_chart', () => {
      const mocked = {
      StorageChart: () => <div data-test-subj="storage-chart">Storage Chart</div>,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./services_table', () => {
      const mocked = {
      ServicesTable: ({ summaryStatsData, loadingSummaryStats }: any) => (
        <div data-test-subj="services-table">
          Services Table: {loadingSummaryStats ? 'loading' : 'loaded'}, Data:{' '}
          {summaryStatsData ? 'present' : 'absent'}
        </div>
      ),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./prompts/permission_denied', () => {
      const mocked = {
      PermissionDenied: () => <div data-test-subj="permission-denied">Permission Denied</div>,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./resources/tips_and_resources', () => {
      const mocked = {
      TipsAndResources: () => <div data-test-subj="tips-and-resources">Tips and Resources</div>,
    };
      return { ...mocked, default: mocked };
    });

function Wrapper({ children }: { children?: ReactNode }) {
  return (
    <MemoryRouter initialEntries={['/storage-explorer']}>
      <MockApmPluginContextWrapper>{children}</MockApmPluginContextWrapper>
    </MemoryRouter>
  );
}

const renderOptions = {
  wrapper: Wrapper,
};

describe('StorageExplorer', () => {
  const defaultParams = {
    query: {
      rangeFrom: 'now-24h',
      rangeTo: 'now',
      environment: 'ENVIRONMENT_ALL',
      kuery: '',
      indexLifecyclePhase: IndexLifecyclePhaseSelectOption.All,
    },
  };

  const defaultTimeRange = {
    start: '2023-01-01T00:00:00Z',
    end: '2023-01-02T00:00:00Z',
  };

  const defaultLocalStorage = [
    { crossClusterSearch: false, optimizePerformance: false },
    vi.fn(),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseApmParams.mockReturnValue(defaultParams);
    mockUseTimeRange.mockReturnValue(defaultTimeRange);
    mockUseLocalStorage.mockReturnValue(defaultLocalStorage);
  });

  describe('Loading State', () => {
    it('displays loading spinner when checking privileges', () => {
      mockUseFetcher.mockReturnValue({
        data: undefined,
        status: FETCH_STATUS.LOADING,
      });

      mockUseProgressiveFetcher.mockReturnValue({
        data: undefined,
        status: FETCH_STATUS.NOT_INITIATED,
      });

      render(<StorageExplorer />, renderOptions);

      expect(screen.getByText('Loading Storage explorer...')).toBeInTheDocument();
    });
  });

  describe('Permission Denied', () => {
    it('shows permission denied when user lacks privileges', () => {
      mockUseFetcher.mockReturnValue({
        data: { hasPrivileges: false },
        status: FETCH_STATUS.SUCCESS,
      });

      mockUseProgressiveFetcher.mockReturnValue({
        data: undefined,
        status: FETCH_STATUS.NOT_INITIATED,
      });

      render(<StorageExplorer />, renderOptions);

      expect(screen.getByTestId('permission-denied')).toBeInTheDocument();
      expect(screen.getByText('Permission Denied')).toBeInTheDocument();
    });
  });

  describe('Successful Load', () => {
    beforeEach(() => {
      mockUseFetcher
        // First call for privileges
        .mockReturnValueOnce({
          data: { hasPrivileges: true },
          status: FETCH_STATUS.SUCCESS,
        })
        // Second call for cross cluster search
        .mockReturnValueOnce({
          data: { isCrossClusterSearch: false },
          status: FETCH_STATUS.SUCCESS,
        });

      mockUseProgressiveFetcher.mockReturnValue({
        data: {
          totalSize: 1000000,
          dailyDataGeneration: 50000,
          tracesPerMinute: 100,
          numberOfServices: 5,
        },
        status: FETCH_STATUS.SUCCESS,
      });
    });

    it('renders all main components when user has privileges', () => {
      render(<StorageExplorer />, renderOptions);

      expect(screen.getByTestId('environment-filter')).toBeInTheDocument();
      expect(screen.getByTestId('lifecycle-phase-select')).toBeInTheDocument();
      expect(screen.getByTestId('summary-stats')).toBeInTheDocument();
      expect(screen.getByTestId('storage-chart')).toBeInTheDocument();
      expect(screen.getByTestId('services-table')).toBeInTheDocument();
    });

    it('passes correct props to ServicesTable', () => {
      render(<StorageExplorer />, renderOptions);

      expect(screen.getByText(/Services Table:.*loaded.*Data:.*present/)).toBeInTheDocument();
    });

    it('passes summary stats data to SummaryStats component', () => {
      render(<StorageExplorer />, renderOptions);

      expect(screen.getByTestId('summary-stats')).toBeInTheDocument();
      expect(screen.getByTestId('services-table')).toBeInTheDocument();
    });
  });

  describe('Loading Summary Stats', () => {
    it('shows loading state for summary stats', () => {
      mockUseFetcher.mockReturnValue({
        data: { hasPrivileges: true },
        status: FETCH_STATUS.SUCCESS,
      });

      mockUseProgressiveFetcher.mockReturnValue({
        data: undefined,
        status: FETCH_STATUS.LOADING,
      });

      render(<StorageExplorer />, renderOptions);

      expect(screen.getByText(/Services Table:.*loading.*Data:.*absent/)).toBeInTheDocument();
    });
  });

  describe('Callouts', () => {
    it('shows optimize performance callout when not dismissed', () => {
      const localStorageWithCallout = [
        { crossClusterSearch: false, optimizePerformance: false },
        vi.fn(),
      ];
      mockUseLocalStorage.mockReturnValue(localStorageWithCallout);

      mockUseFetcher.mockReturnValue({
        data: { hasPrivileges: true },
        status: FETCH_STATUS.SUCCESS,
      });

      mockUseProgressiveFetcher.mockReturnValue({
        data: { totalSize: 1000000 },
        status: FETCH_STATUS.SUCCESS,
      });

      render(<StorageExplorer />, renderOptions);

      expect(screen.getByTestId('apmStorageExplorerLongLoadingTimeCallout')).toBeInTheDocument();
    });

    it('hides callouts when dismissed', () => {
      const localStorageWithDismissedCallouts = [
        { crossClusterSearch: true, optimizePerformance: true },
        vi.fn(),
      ];
      mockUseLocalStorage.mockReturnValue(localStorageWithDismissedCallouts);

      mockUseFetcher.mockReturnValue({
        data: { hasPrivileges: true },
        status: FETCH_STATUS.SUCCESS,
      });

      mockUseProgressiveFetcher.mockReturnValue({
        data: { totalSize: 1000000 },
        status: FETCH_STATUS.SUCCESS,
      });

      render(<StorageExplorer />, renderOptions);

      expect(
        screen.queryByTestId('apmStorageExplorerLongLoadingTimeCallout')
      ).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles API errors gracefully', () => {
      mockUseFetcher.mockReturnValue({
        data: { hasPrivileges: true },
        status: FETCH_STATUS.SUCCESS,
      });

      mockUseProgressiveFetcher.mockReturnValue({
        data: undefined,
        status: FETCH_STATUS.FAILURE,
        error: new Error('API Error'),
      });

      render(<StorageExplorer />, renderOptions);

      expect(screen.getByTestId('services-table')).toBeInTheDocument();
    });
  });
});
