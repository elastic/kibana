/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';

import { mockVulnerableUsersBySeverityResult } from './mock_data';
import { useUserAlertsItems } from './user_alerts_items';

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
  fetchQueryAlerts: () => mockVulnerableUsersBySeverityResult,
}));

jest.mock('../../../../detections/containers/detection_engine/alerts/use_signal_index', () => ({
  useSignalIndex: () => ({
    loading: false,
    signalIndexName: 'detections',
  }),
}));

describe('useUserAlertsItems', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('initializes', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() =>
        useUserAlertsItems({ queryId: 'someId', skip: false })
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
        useUserAlertsItems({
          queryId: 'someid',
          skip: false,
        })
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      expect(result.current).toEqual({
        data: [
          {
            totalAlerts: 4,
            critical: 4,
            high: 1,
            userName: 'crffn20qcs',

            low: 1,
            medium: 1,
          },
          {
            totalAlerts: 4,
            critical: 1,
            high: 11,
            userName: 'd058hziijl',
            low: 1,
            medium: 1,
          },
          {
            totalAlerts: 4,
            critical: 1,
            high: 1,
            userName: 'nenha4bdhv',
            low: 3,
            medium: 3,
          },
          {
            totalAlerts: 2,
            critical: 0,
            high: 1,
            userName: 'u68nq414uw',
            low: 10,
            medium: 0,
          },
        ],
        isLoading: false,
      });
    });
  });
});
