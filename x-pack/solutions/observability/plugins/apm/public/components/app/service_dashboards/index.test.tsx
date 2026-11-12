/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, render } from '@testing-library/react';
import React from 'react';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import { ServiceDashboards } from '.';

let capturedOnApiAvailable: ((api: unknown) => void) | undefined;
let capturedOnApiCleanup: (() => void) | undefined;

// Every render of the mocked renderer records the closures it received. Keeping the full history
// lets a test replay the race where a canceled load for a previous dashboard fires its (stale)
// cleanup after a newer dashboard has already published its API.
let capturedOnApiAvailableHistory: Array<(api: unknown) => void> = [];
let capturedOnApiCleanupHistory: Array<() => void> = [];

jest.mock('@kbn/dashboard-plugin/public', () => ({
  DashboardRenderer: (props: {
    onApiAvailable?: (api: unknown) => void;
    onApiCleanup?: () => void;
  }) => {
    capturedOnApiAvailable = props.onApiAvailable;
    capturedOnApiCleanup = props.onApiCleanup;
    if (props.onApiAvailable) capturedOnApiAvailableHistory.push(props.onApiAvailable);
    if (props.onApiCleanup) capturedOnApiCleanupHistory.push(props.onApiCleanup);
    return <div data-test-subj="dashboardRenderer" />;
  },
}));

const mockDataView = {
  id: 'test-data-view-id',
  getFieldByName: (name: string) => ({ name, type: 'string' } as unknown as DataViewField),
} as unknown as DataView;

// Mutable so a test can change a search input between renders and assert the stale,
// destroyed dashboard API no longer receives the resulting synchronization calls.
const defaultMockQuery = {
  environment: 'ENVIRONMENT_ALL',
  kuery: '',
  rangeFrom: 'now-15m',
  rangeTo: 'now',
  dashboardId: 'dashboard-1',
};
let mockQuery = { ...defaultMockQuery };

jest.mock('../../../hooks/use_apm_params', () => ({
  useAnyOfApmParams: () => ({
    path: { serviceName: 'test-service' },
    query: mockQuery,
  }),
}));

jest.mock('../../../hooks/use_time_range', () => ({
  useTimeRange: () => ({ start: 'now-15m', end: 'now' }),
}));

jest.mock('../../../hooks/use_adhoc_apm_data_view', () => ({
  useAdHocApmDataView: () => ({ dataView: mockDataView }),
}));

// Stable references so effects depending on them do not re-run every render.
const mockAvailableDashboards = [
  { id: 'dashboard-1', data: { title: 'My dashboard' } },
  { id: 'dashboard-2', data: { title: 'My other dashboard' } },
];

jest.mock('../../../hooks/use_dashboards_fetcher', () => ({
  useDashboardFetcher: () => ({ data: mockAvailableDashboards }),
}));

jest.mock('../../../context/apm_plugin/use_apm_plugin_context', () => ({
  useApmPluginContext: () => ({ share: undefined }),
}));

const mockFetcherData = {
  serviceDashboards: [
    {
      dashboardSavedObjectId: 'dashboard-1',
      serviceEnvironmentFilterEnabled: true,
      serviceNameFilterEnabled: true,
    },
    {
      dashboardSavedObjectId: 'dashboard-2',
      serviceEnvironmentFilterEnabled: true,
      serviceNameFilterEnabled: true,
    },
  ],
};
const mockRefetch = jest.fn();

jest.mock('../../../hooks/use_fetcher', () => {
  const actual = jest.requireActual('../../../hooks/use_fetcher');
  return {
    ...actual,
    useFetcher: () => ({
      data: mockFetcherData,
      status: actual.FETCH_STATUS.SUCCESS,
      refetch: mockRefetch,
    }),
  };
});

describe('ServiceDashboards', () => {
  beforeEach(() => {
    capturedOnApiAvailable = undefined;
    capturedOnApiCleanup = undefined;
    capturedOnApiAvailableHistory = [];
    capturedOnApiCleanupHistory = [];
    mockQuery = { ...defaultMockQuery };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('dashboard lifecycle', () => {
    it('stops pushing unified-search state onto the dashboard API after it is destroyed, and picks up a recreated API', async () => {
      const dashboardApi = {
        setFilters: jest.fn(),
        setQuery: jest.fn(),
        setTimeRange: jest.fn(),
      };

      const { rerender } = render(<ServiceDashboards />);

      expect(capturedOnApiAvailable).toBeDefined();
      expect(capturedOnApiCleanup).toBeDefined();

      // Dashboard becomes available, so the effect pushes the initial state onto it.
      await act(async () => {
        capturedOnApiAvailable!(dashboardApi);
      });

      expect(dashboardApi.setFilters).toHaveBeenCalled();
      dashboardApi.setFilters.mockClear();
      dashboardApi.setQuery.mockClear();
      dashboardApi.setTimeRange.mockClear();

      // The DashboardRenderer tears the embeddable down (e.g. on unmount/recreate), which clears
      // the stale reference so later effects cannot operate on a destroyed dashboard.
      await act(async () => {
        capturedOnApiCleanup!();
      });

      // Change a search input and rerender so the synchronization effect re-runs. If the stale
      // reference had not been cleared, the destroyed API would receive these calls; the `!dashboard`
      // guard must short-circuit instead. This is what distinguishes the fix from a no-op cleanup.
      await act(async () => {
        mockQuery = { ...defaultMockQuery, kuery: 'transaction.name: "GET /api"' };
        rerender(<ServiceDashboards />);
      });

      expect(dashboardApi.setFilters).not.toHaveBeenCalled();
      expect(dashboardApi.setQuery).not.toHaveBeenCalled();
      expect(dashboardApi.setTimeRange).not.toHaveBeenCalled();

      // A recreated embeddable delivers a fresh API, which must be picked up again so
      // unified-search state is pushed onto the new dashboard.
      const recreatedDashboardApi = {
        setFilters: jest.fn(),
        setQuery: jest.fn(),
        setTimeRange: jest.fn(),
      };

      await act(async () => {
        capturedOnApiAvailable!(recreatedDashboardApi);
      });

      expect(recreatedDashboardApi.setFilters).toHaveBeenCalled();
      expect(recreatedDashboardApi.setQuery).toHaveBeenCalled();
      expect(recreatedDashboardApi.setTimeRange).toHaveBeenCalled();
    });

    it('keeps the current dashboard reference when a stale cleanup for a previous dashboard fires late', async () => {
      const dashboardApiA = {
        setFilters: jest.fn(),
        setQuery: jest.fn(),
        setTimeRange: jest.fn(),
      };
      const dashboardApiB = {
        setFilters: jest.fn(),
        setQuery: jest.fn(),
        setTimeRange: jest.fn(),
      };

      // Render dashboard A and publish its API through A's closure.
      const { rerender } = render(<ServiceDashboards />);
      const onApiAvailableA = capturedOnApiAvailableHistory[capturedOnApiAvailableHistory.length - 1];
      const onApiCleanupA = capturedOnApiCleanupHistory[capturedOnApiCleanupHistory.length - 1];

      await act(async () => {
        onApiAvailableA(dashboardApiA);
      });
      expect(dashboardApiA.setFilters).toHaveBeenCalled();

      // Switch to dashboard B (new savedObjectId) and publish B's API through B's closure.
      await act(async () => {
        mockQuery = { ...defaultMockQuery, dashboardId: 'dashboard-2' };
        rerender(<ServiceDashboards />);
      });
      const onApiAvailableB = capturedOnApiAvailableHistory[capturedOnApiAvailableHistory.length - 1];

      await act(async () => {
        onApiAvailableB(dashboardApiB);
      });

      dashboardApiA.setFilters.mockClear();
      dashboardApiA.setQuery.mockClear();
      dashboardApiA.setTimeRange.mockClear();
      dashboardApiB.setFilters.mockClear();
      dashboardApiB.setQuery.mockClear();
      dashboardApiB.setTimeRange.mockClear();

      // A's canceled load now fires its late cleanup. Because it is keyed on A's id and B has
      // already published, the guard short-circuits and B's reference survives.
      await act(async () => {
        onApiCleanupA();
      });

      // A change to a search input re-runs the synchronization effect; B must still receive it.
      await act(async () => {
        mockQuery = { ...mockQuery, kuery: 'transaction.name: "GET /api"' };
        rerender(<ServiceDashboards />);
      });

      expect(dashboardApiB.setFilters).toHaveBeenCalled();
      expect(dashboardApiB.setQuery).toHaveBeenCalled();
      expect(dashboardApiB.setTimeRange).toHaveBeenCalled();
      // A is destroyed and must never be touched again.
      expect(dashboardApiA.setFilters).not.toHaveBeenCalled();
      expect(dashboardApiA.setQuery).not.toHaveBeenCalled();
      expect(dashboardApiA.setTimeRange).not.toHaveBeenCalled();
    });
  });
});
