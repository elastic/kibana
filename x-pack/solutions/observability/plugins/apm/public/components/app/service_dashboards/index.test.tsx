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

jest.mock('@kbn/dashboard-plugin/public', () => ({
  DashboardRenderer: (props: {
    onApiAvailable?: (api: unknown) => void;
    onApiCleanup?: () => void;
  }) => {
    capturedOnApiAvailable = props.onApiAvailable;
    capturedOnApiCleanup = props.onApiCleanup;
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
const mockAvailableDashboards = [{ id: 'dashboard-1', data: { title: 'My dashboard' } }];

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
  });
});
