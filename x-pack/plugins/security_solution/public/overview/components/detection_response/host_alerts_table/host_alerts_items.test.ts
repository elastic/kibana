/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { mockVulnerableHostsBySeverityResult } from './mock_data';

import { buildVulnerableHostAggregationQuery, useHostAlertsItems } from './host_alerts_items';

jest.mock('../../../../detections/containers/detection_engine/alerts/api', () => ({
  fetchQueryAlerts: () => mockVulnerableHostsBySeverityResult,
}));

jest.mock('../../../../detections/containers/detection_engine/alerts/use_signal_index', () => ({
  useSignalIndex: () => ({
    loading: false,
    signalIndexName: 'detections',
  }),
}));

const from = '2022-03-02T10:13:37.853Z';
const to = '2022-03-29T10:13:37.853Z';

describe('useVulnerableHostsCounters', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('initializes', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() =>
        useHostAlertsItems({ from: 'initial_date', to: 'end_date' })
      );
      await waitForNextUpdate();
      expect(result.current).toEqual({
        data: {
          counters: [],
          id: 'vulnerableHostsBySeverityQuery',
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
        useHostAlertsItems({
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
              hostName: 'Host-342m5gl1g2',
              count: 100,
              critical: 5,
              high: 50,
              low: 40,
              medium: 5,
            },
            {
              hostName: 'Host-vns3hyykhu',
              count: 104,
              critical: 4,
              high: 100,
              low: 0,
              medium: 0,
            },
            {
              hostName: 'Host-awafztonav',
              count: 108,
              critical: 4,
              high: 50,
              low: 50,
              medium: 4,
            },
            {
              hostName: 'Host-56k7zf5kne',
              count: 128,
              critical: 1,
              high: 6,
              low: 59,
              medium: 62,
            },
          ],
          id: 'vulnerableHostsBySeverityQuery',
          inspect: {
            dsl: JSON.stringify(
              { index: ['detections'], body: buildVulnerableHostAggregationQuery({ from, to }) },
              null,
              2
            ),
            response: JSON.stringify(mockVulnerableHostsBySeverityResult, null, 2),
          },
          isInspected: false,
        },
        isLoading: false,
        refetch: result.current.refetch,
      });
    });
  });
});
