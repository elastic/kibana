/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useServiceBadgesData } from './use_service_badges_data';

const mockUseFetcher = jest.fn();
jest.mock('../../../../hooks/use_fetcher', () => ({
  useFetcher: (...args: unknown[]) => mockUseFetcher(...args),
  FETCH_STATUS: {
    SUCCESS: 'success',
    LOADING: 'loading',
    NOT_INITIATED: 'not_initiated',
    FAILURE: 'failure',
  },
}));

const mockUseServiceFlyoutContext = jest.fn();
jest.mock('../service_flyout_context', () => ({
  useServiceFlyoutContext: () => mockUseServiceFlyoutContext(),
}));

jest.mock('../../../../hooks/use_time_range', () => ({
  useTimeRange: () => ({
    start: '2024-01-01T00:00:00.000Z',
    end: '2024-01-01T01:00:00.000Z',
  }),
}));

jest.mock('../../../alerting/utils/get_alerting_capabilities', () => ({
  getAlertingCapabilities: () => ({ canReadAlerts: true, isAlertingAvailable: true }),
}));

const baseParams = {
  serviceName: 'opbeans-java',
  environment: 'production' as const,
  rangeFrom: 'now-15m',
  rangeTo: 'now',
};

function setupContext({ canReadSlos = true, canReadMlJobs = true } = {}) {
  mockUseServiceFlyoutContext.mockReturnValue({
    deps: {
      core: {
        application: {
          capabilities: { slo: { read: canReadSlos }, ml: { canGetJobs: canReadMlJobs } },
        },
      },
      alerting: {},
    },
  });
}

// Sets up useFetcher to return fixed values for the three sequential calls:
// 1st = alerts, 2nd = anomaly, 3rd = slos
function setupFetchers({
  alertsData = { alertsCount: 0 },
  alertsStatus = 'success',
  anomalyData = {},
  anomalyStatus = 'success',
  slosData = undefined as object | undefined,
  slosStatus = 'success',
} = {}) {
  mockUseFetcher
    .mockReturnValueOnce({ data: alertsData, status: alertsStatus })
    .mockReturnValueOnce({ data: anomalyData, status: anomalyStatus })
    .mockReturnValueOnce({ data: slosData, status: slosStatus });
}

describe('useServiceBadgesData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupContext();
  });

  describe('sloData — getWorstSloStatus derivation', () => {
    it('returns violated status and its count when violated SLOs exist', () => {
      setupFetchers({
        slosData: {
          total: 5,
          statusCounts: { violated: 2, degrading: 1, healthy: 2, noData: 0 },
        },
      });

      const { result } = renderHook(() => useServiceBadgesData(baseParams));

      expect(result.current.sloData).toEqual({ sloStatus: 'violated', sloCount: 2 });
    });

    it('returns degrading when no violated SLOs exist', () => {
      setupFetchers({
        slosData: {
          total: 3,
          statusCounts: { violated: 0, degrading: 3, healthy: 0, noData: 0 },
        },
      });

      const { result } = renderHook(() => useServiceBadgesData(baseParams));

      expect(result.current.sloData).toEqual({ sloStatus: 'degrading', sloCount: 3 });
    });

    it('returns noData before healthy when both are present', () => {
      setupFetchers({
        slosData: {
          total: 4,
          statusCounts: { violated: 0, degrading: 0, healthy: 3, noData: 1 },
        },
      });

      const { result } = renderHook(() => useServiceBadgesData(baseParams));

      expect(result.current.sloData).toEqual({ sloStatus: 'noData', sloCount: 1 });
    });

    it('returns noSLOs when total is 0', () => {
      setupFetchers({
        slosData: {
          total: 0,
          statusCounts: { violated: 0, degrading: 0, healthy: 0, noData: 0 },
        },
      });

      const { result } = renderHook(() => useServiceBadgesData(baseParams));

      expect(result.current.sloData).toEqual({ sloStatus: 'noSLOs', sloCount: 0 });
    });

    it('returns healthy as the lowest-priority status', () => {
      setupFetchers({
        slosData: {
          total: 4,
          statusCounts: { violated: 0, degrading: 0, healthy: 4, noData: 0 },
        },
      });

      const { result } = renderHook(() => useServiceBadgesData(baseParams));

      expect(result.current.sloData).toEqual({ sloStatus: 'healthy', sloCount: 4 });
    });

    it('returns noSLOs when statusCounts is missing', () => {
      setupFetchers({ slosData: { total: 2, statusCounts: undefined } });

      const { result } = renderHook(() => useServiceBadgesData(baseParams));

      expect(result.current.sloData).toEqual({ sloStatus: 'noSLOs', sloCount: 0 });
    });
  });

  describe('sloData — fetch lifecycle', () => {
    it('returns undefined sloData while the fetch is in progress', () => {
      setupFetchers({ slosData: undefined, slosStatus: 'loading' });

      const { result } = renderHook(() => useServiceBadgesData(baseParams));

      expect(result.current.sloData).toBeUndefined();
    });

    it('returns undefined sloData when the user cannot read SLOs', () => {
      setupContext({ canReadSlos: false });
      setupFetchers();

      const { result } = renderHook(() => useServiceBadgesData(baseParams));

      expect(result.current.sloData).toBeUndefined();
    });
  });

  describe('alertsCount', () => {
    it('returns the count when alerts are present', () => {
      setupFetchers({ alertsData: { alertsCount: 5 } });

      const { result } = renderHook(() => useServiceBadgesData(baseParams));

      expect(result.current.alertsCount).toBe(5);
    });

    it('returns undefined when alertsCount is 0', () => {
      setupFetchers({ alertsData: { alertsCount: 0 } });

      const { result } = renderHook(() => useServiceBadgesData(baseParams));

      expect(result.current.alertsCount).toBeUndefined();
    });
  });

  describe('anomalyData', () => {
    it('returns anomaly data when a score is present', () => {
      setupFetchers({ anomalyData: { anomalyScore: 75, anomalyEnvironment: 'production' } });

      const { result } = renderHook(() => useServiceBadgesData(baseParams));

      expect(result.current.anomalyData).toEqual({
        anomalyScore: 75,
        anomalyEnvironment: 'production',
      });
    });

    it('returns undefined when anomalyScore is absent', () => {
      setupFetchers({ anomalyData: {} });

      const { result } = renderHook(() => useServiceBadgesData(baseParams));

      expect(result.current.anomalyData).toBeUndefined();
    });
  });
});
