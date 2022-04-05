/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { mockVulnerableUsersBySeverityResult } from './mock_data';

import { buildVulnerableHostAggregationQuery, useUserAlertsItems } from './user_alerts_items';

jest.mock('../../../../detections/containers/detection_engine/alerts/api', () => ({
  fetchQueryAlerts: () => mockVulnerableUsersBySeverityResult,
}));

jest.mock('../../../../detections/containers/detection_engine/alerts/use_signal_index', () => ({
  useSignalIndex: () => ({
    loading: false,
    signalIndexName: 'detections',
  }),
}));

const from = '2022-03-02T10:13:37.853Z';
const to = '2022-03-29T10:13:37.853Z';

describe('useUserAlertsItems', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('initializes', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() =>
        useUserAlertsItems({ from: 'initial_date', to: 'end_date' })
      );
      await waitForNextUpdate();
      expect(result.current).toEqual({
        data: {
          counters: [],
          id: 'vulnerableUsersBySeverityQuery',
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
        useUserAlertsItems({
          from,
          to,
        })
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      expect(result.current).toEqual({
        data: {
          counters: [
            {
              count: 4,
              critical: 4,
              high: 1,
              userName: 'crffn20qcs',

              low: 1,
              medium: 1,
            },
            {
              count: 4,
              critical: 1,
              high: 11,
              userName: 'd058hziijl',
              low: 1,
              medium: 1,
            },
            {
              count: 4,
              critical: 1,
              high: 1,
              userName: 'nenha4bdhv',
              low: 3,
              medium: 3,
            },
            {
              count: 2,
              critical: 0,
              high: 1,
              userName: 'u68nq414uw',
              low: 10,
              medium: 0,
            },
          ],
          id: 'vulnerableUsersBySeverityQuery',
          inspect: {
            dsl: JSON.stringify(
              { index: ['detections'], body: buildVulnerableHostAggregationQuery({ from, to }) },
              null,
              2
            ),
            response: JSON.stringify(mockVulnerableUsersBySeverityResult, null, 2),
          },
          isInspected: false,
        },
        isLoading: false,
        refetch: result.current.refetch,
      });
    });
  });
});
