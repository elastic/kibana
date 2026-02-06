/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { StorageExplorer } from '.';
import { MockApmPluginContextWrapper } from '../../../context/apm_plugin/mock_apm_plugin_context';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { IndexLifecyclePhaseSelectOption } from '../../../../common/storage_explorer_types';

// Mock the hooks
const mockUseFetcher = jest.fn();
const mockUseProgressiveFetcher = jest.fn();
const mockUseApmParams = jest.fn();
const mockUseTimeRange = jest.fn();
const mockUseLocalStorage = jest.fn();

jest.mock('../../../hooks/use_fetcher', () => ({
  useFetcher: () => mockUseFetcher(),
  FETCH_STATUS: {
    LOADING: 'loading',
    SUCCESS: 'success',
    FAILURE: 'failure',
    NOT_INITIATED: 'not_initiated',
  },
  isPending: jest.fn((status) => status === 'loading'),
}));

jest.mock('../../../hooks/use_progressive_fetcher', () => ({
  useProgressiveFetcher: () => mockUseProgressiveFetcher(),
}));

jest.mock('../../../hooks/use_apm_params', () => ({
  useApmParams: () => mockUseApmParams(),
}));

jest.mock('../../../hooks/use_time_range', () => ({
  useTimeRange: () => mockUseTimeRange(),
}));

jest.mock('../../../hooks/use_local_storage', () => ({
  useLocalStorage: () => mockUseLocalStorage(),
}));

// Mock child components
jest.mock('../../shared/search_bar/search_bar', () => ({
  SearchBar: () => <div data-test-subj="search-bar">SearchBar</div>,
}));

jest.mock('../../shared/environment_filter', () => ({
  ApmEnvironmentFilter: () => <div data-test-subj="environment-filter">Environment Filter</div>,
}));

jest.mock('./index_lifecycle_phase_select', () => ({
  IndexLifecyclePhaseSelect: () => (
    <div data-test-subj="lifecycle-phase-select">Lifecycle Phase Select</div>
  ),
}));

jest.mock('./summary_stats', () => ({
  SummaryStats: ({ summaryStatsData }: { summaryStatsData: any }) => (
    <div data-test-subj="summary-stats">
      Summary Stats: {summaryStatsData ? 'with data' : 'no data'}
    </div>
  ),
}));

jest.mock('./storage_chart', () => ({
  StorageChart: () => <div data-test-subj="storage-chart">Storage Chart</div>,
}));

jest.mock('./services_table', () => ({
  ServicesTable: ({ summaryStatsData, loadingSummaryStats }: any) => (
    <div data-test-subj="services-table">
      Services Table: {loadingSummaryStats ? 'loading' : 'loaded'}, Data:{' '}
      {summaryStatsData ? 'present' : 'absent'}
    </div>
  ),
}));

jest.mock('./prompts/permission_denied', () => ({
  PermissionDenied: () => <div data-test-subj="permission-denied">Permission Denied</div>,
}));

jest.mock('./resources/tips_and_resources', () => ({
  TipsAndResources: () => <div data-test-subj="tips-and-resources">Tips and Resources</div>,
}));

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
    jest.fn(),
  ];

  beforeEach(() => {
    jest.clearAllMocks();
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

      expect(screen.getByTestId('search-bar')).toBeInTheDocument();
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
        jest.fn(),
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

      expect(screen.getByTestId('search-bar')).toBeInTheDocument();
      expect(screen.getByTestId('apmStorageExplorerLongLoadingTimeCallout')).toBeInTheDocument();
    });

    it('hides callouts when dismissed', () => {
      const localStorageWithDismissedCallouts = [
        { crossClusterSearch: true, optimizePerformance: true },
        jest.fn(),
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

      expect(screen.getByTestId('search-bar')).toBeInTheDocument();
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

      // Component should still render main structure even with API errors
      expect(screen.getByTestId('search-bar')).toBeInTheDocument();
      expect(screen.getByTestId('services-table')).toBeInTheDocument();
    });
  });
});
