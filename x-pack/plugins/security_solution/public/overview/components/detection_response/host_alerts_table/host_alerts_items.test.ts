/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';

import { useHostAlertsItems } from './use_host_alerts_items';
import { mockVulnerableHostsBySeverityResult } from './mock_data';

jest.mock('../../../../common/containers/use_global_time', () => ({
  useGlobalTime: () => ({
    from: '2020-07-07T08:20:18.966Z',
    isInitializing: false,
    to: '2020-07-08T08:20:18.966Z',
    setQuery: jest.fn(),
    deleteQuery: jest.fn(),
  }),
}));

jest.mock('../../../../detections/containers/detection_engine/alerts/api', () => ({
  fetchQueryAlerts: () => mockVulnerableHostsBySeverityResult,
}));

jest.mock('../../../../detections/containers/detection_engine/alerts/use_signal_index', () => ({
  useSignalIndex: () => ({
    loading: false,
    signalIndexName: 'detections',
  }),
}));

describe('useVulnerableHostsCounters', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('initializes', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() =>
        useHostAlertsItems({
          queryId: 'someQueryid',
          skip: false,
        })
      );
      await waitForNextUpdate();
      expect(result.current).toEqual({
        data: [],
        isLoading: false,
      });
    });
  });
  it('correctly transforms response', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() =>
        useHostAlertsItems({
          queryId: 'someQueryid',
          skip: false,
        })
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      expect(result.current).toEqual({
        data: [
          {
            hostName: 'Host-342m5gl1g2',
            totalAlerts: 100,
            critical: 5,
            high: 50,
            low: 40,
            medium: 5,
          },
          {
            hostName: 'Host-vns3hyykhu',
            totalAlerts: 104,
            critical: 4,
            high: 100,
            low: 0,
            medium: 0,
          },
          {
            hostName: 'Host-awafztonav',
            totalAlerts: 108,
            critical: 4,
            high: 50,
            low: 50,
            medium: 4,
          },
          {
            hostName: 'Host-56k7zf5kne',
            totalAlerts: 128,
            critical: 1,
            high: 6,
            low: 59,
            medium: 62,
          },
        ],
        isLoading: false,
      });
    });
  });
});
