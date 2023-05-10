/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertConsumers } from '@kbn/rule-data-utils';
import { act, renderHook } from '@testing-library/react-hooks';
import { kibanaStartMock } from '../utils/kibana_react.mock';
import {
  UseAlertsHistory,
  useAlertsHistory,
  type Props as useAlertsHistoryProps,
} from './use_alerts_history';

const mockUseKibanaReturnValue = kibanaStartMock.startContract();

jest.mock('../utils/kibana_react', () => ({
  __esModule: true,
  useKibana: jest.fn(() => mockUseKibanaReturnValue),
}));

describe('useAlertsHistory', () => {
  const start = '2023-04-10T00:00:00.000Z';
  const end = '2023-05-10T00:00:00.000Z';
  const ruleId = 'cfd36e60-ef22-11ed-91eb-b7893acacfe2';

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('initially it is loading and no date to return', async () => {
    mockUseKibanaReturnValue.services.http.post.mockImplementation(async () => ({}));
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<useAlertsHistoryProps, UseAlertsHistory>(
        () =>
          useAlertsHistory({
            featureIds: [AlertConsumers.APM],
            ruleId,
            dateRange: { from: start, to: end },
          })
      );

      await waitForNextUpdate();

      expect(result.current).toEqual({
        loading: true,
        error: undefined,
        refetch: expect.any(Function),
      });
    });
  });

  it('returns no data when an error occurs', async () => {
    const errorMsg = 'a network error';

    mockUseKibanaReturnValue.services.http.post.mockImplementation(async () => {
      throw new Error('a network error');
    });

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<useAlertsHistoryProps, UseAlertsHistory>(
        () =>
          useAlertsHistory({
            featureIds: [AlertConsumers.APM],
            ruleId,
            dateRange: { from: start, to: end },
          })
      );

      await waitForNextUpdate();
      await waitForNextUpdate();

      expect(result.current.error?.message).toEqual(errorMsg);
      expect(result.current.loading).toBeFalsy();
      expect(result.current.avgTimeToRecoverUS).toBeFalsy();
      expect(result.current.histogramTriggeredAlerts).toBeFalsy();
      expect(result.current.totalTriggeredAlerts).toBeFalsy();
    });
  });

  it('returns the alert history data', async () => {
    mockUseKibanaReturnValue.services.http.post.mockImplementation(async () => ({
      hits: { total: { value: 32, relation: 'eq' }, max_score: null, hits: [] },
      aggregations: {
        avgTimeToRecoverUS: { doc_count: 28, recoveryTime: { value: 134959464.2857143 } },
        histogramTriggeredAlerts: {
          buckets: [
            { key_as_string: '2023-04-10T00:00:00.000Z', key: 1681084800000, doc_count: 0 },
            { key_as_string: '2023-04-11T00:00:00.000Z', key: 1681171200000, doc_count: 0 },
            { key_as_string: '2023-04-12T00:00:00.000Z', key: 1681257600000, doc_count: 0 },
            { key_as_string: '2023-04-13T00:00:00.000Z', key: 1681344000000, doc_count: 0 },
            { key_as_string: '2023-04-14T00:00:00.000Z', key: 1681430400000, doc_count: 0 },
            { key_as_string: '2023-04-15T00:00:00.000Z', key: 1681516800000, doc_count: 0 },
            { key_as_string: '2023-04-16T00:00:00.000Z', key: 1681603200000, doc_count: 0 },
            { key_as_string: '2023-04-17T00:00:00.000Z', key: 1681689600000, doc_count: 0 },
            { key_as_string: '2023-04-18T00:00:00.000Z', key: 1681776000000, doc_count: 0 },
            { key_as_string: '2023-04-19T00:00:00.000Z', key: 1681862400000, doc_count: 0 },
            { key_as_string: '2023-04-20T00:00:00.000Z', key: 1681948800000, doc_count: 0 },
            { key_as_string: '2023-04-21T00:00:00.000Z', key: 1682035200000, doc_count: 0 },
            { key_as_string: '2023-04-22T00:00:00.000Z', key: 1682121600000, doc_count: 0 },
            { key_as_string: '2023-04-23T00:00:00.000Z', key: 1682208000000, doc_count: 0 },
            { key_as_string: '2023-04-24T00:00:00.000Z', key: 1682294400000, doc_count: 0 },
            { key_as_string: '2023-04-25T00:00:00.000Z', key: 1682380800000, doc_count: 0 },
            { key_as_string: '2023-04-26T00:00:00.000Z', key: 1682467200000, doc_count: 0 },
            { key_as_string: '2023-04-27T00:00:00.000Z', key: 1682553600000, doc_count: 0 },
            { key_as_string: '2023-04-28T00:00:00.000Z', key: 1682640000000, doc_count: 0 },
            { key_as_string: '2023-04-29T00:00:00.000Z', key: 1682726400000, doc_count: 0 },
            { key_as_string: '2023-04-30T00:00:00.000Z', key: 1682812800000, doc_count: 0 },
            { key_as_string: '2023-05-01T00:00:00.000Z', key: 1682899200000, doc_count: 0 },
            { key_as_string: '2023-05-02T00:00:00.000Z', key: 1682985600000, doc_count: 0 },
            { key_as_string: '2023-05-03T00:00:00.000Z', key: 1683072000000, doc_count: 0 },
            { key_as_string: '2023-05-04T00:00:00.000Z', key: 1683158400000, doc_count: 0 },
            { key_as_string: '2023-05-05T00:00:00.000Z', key: 1683244800000, doc_count: 0 },
            { key_as_string: '2023-05-06T00:00:00.000Z', key: 1683331200000, doc_count: 0 },
            { key_as_string: '2023-05-07T00:00:00.000Z', key: 1683417600000, doc_count: 0 },
            { key_as_string: '2023-05-08T00:00:00.000Z', key: 1683504000000, doc_count: 0 },
            { key_as_string: '2023-05-09T00:00:00.000Z', key: 1683590400000, doc_count: 0 },
            { key_as_string: '2023-05-10T00:00:00.000Z', key: 1683676800000, doc_count: 32 },
          ],
        },
      },
    }));
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<useAlertsHistoryProps, UseAlertsHistory>(
        () =>
          useAlertsHistory({
            featureIds: [AlertConsumers.APM],
            ruleId,
            dateRange: { from: start, to: end },
          })
      );

      await waitForNextUpdate();
      await waitForNextUpdate();

      expect(result.current.loading).toBeFalsy();
      expect(result.current.error).toBeFalsy();
      expect(result.current.avgTimeToRecoverUS).toEqual(134959464.2857143);
      expect(result.current.histogramTriggeredAlerts?.length).toEqual(31);
      expect(result.current.totalTriggeredAlerts).toEqual(32);
    });
  });
});
