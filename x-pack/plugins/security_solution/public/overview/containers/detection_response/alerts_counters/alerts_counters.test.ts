/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import {
  mockStatusSeverityAlertCountersRequest,
  mockStatusSeverityAlertCountersResult,
} from './mockData';

import { useStatusSeverityAlertCounters } from './alerts_counters';

jest.mock('../../../../detections/containers/detection_engine/alerts/api', () => ({
  fetchQueryAlerts: () => mockStatusSeverityAlertCountersResult,
}));

jest.mock('../../../../detections/containers/detection_engine/alerts/use_signal_index', () => ({
  useSignalIndex: () => ({
    loading: false,
    signalIndexName: 'detections',
  }),
}));

describe('useStatusSeverityAlertCounters', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('initializes', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() =>
        useStatusSeverityAlertCounters({ from: 'initial_date', to: 'end_date' })
      );
      await waitForNextUpdate();
      expect(result.current).toEqual({
        data: {
          counters: {},
          id: 'alertCountersByStatusAndSeverityQuery',
          inspect: {
            dsl: '',
            response: '',
          },
          isInspected: false,
        },
        isLoading: false,
        refetch: null,
      });
    });
  });
  it('correctly transforms response', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() =>
        useStatusSeverityAlertCounters({
          from: '2022-03-02T10:13:37.853Z',
          to: '2022-03-29T10:13:37.853Z',
        })
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      expect(result.current).toEqual({
        data: {
          counters: {
            open: { count: 969, low: 538, medium: 431 },
            closed: { count: 7, low: 5, medium: 2 },
            acknowledged: { count: 6, low: 3, medium: 3 },
          },
          id: 'alertCountersByStatusAndSeverityQuery',
          inspect: {
            dsl: JSON.stringify(
              { index: ['detections'] ?? [''], body: mockStatusSeverityAlertCountersRequest },
              null,
              2
            ),
            response: JSON.stringify(mockStatusSeverityAlertCountersResult, null, 2),
          },
          isInspected: false,
        },
        isLoading: false,
        refetch: result.current.refetch,
      });
    });
  });
});
