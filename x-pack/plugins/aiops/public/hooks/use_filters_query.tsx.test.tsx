/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FilterQueryContextProvider, useFilterQueryUpdates } from './use_filters_query';
import { renderHook } from '@testing-library/react-hooks';
import { dataPluginMock as mockDataPlugin } from '@kbn/data-plugin/public/mocks';
import { Timefilter } from '@kbn/data-plugin/public/query';
import { useAiopsAppContext } from './use_aiops_app_context';

jest.mock('./use_aiops_app_context');

jest.mock('@kbn/ml-date-picker', () => ({
  useTimeRangeUpdates: jest.fn(() => {
    return { from: 'now-24h', to: 'now' };
  }),
}));

describe('useFilterQueryUpdates', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2024-02-23T00:13:45.000Z'));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('provides correct search bounds for relative time range', () => {
    const mockDataContract = mockDataPlugin.createStartContract();

    const mockTimefilterConfig = {
      timeDefaults: { from: 'now-15m', to: 'now' },
      refreshIntervalDefaults: { pause: false, value: 0 },
    };

    useAiopsAppContext().data.query.timefilter.timefilter = new Timefilter(
      mockTimefilterConfig,
      mockDataContract.query.timefilter.history,
      // @ts-ignore
      mockDataContract.nowProvider
    );

    const {
      result: { current: currentResult },
    } = renderHook(() => useFilterQueryUpdates(), {
      wrapper: FilterQueryContextProvider,
    });

    expect(currentResult.timeRange).toEqual({ from: 'now-24h', to: 'now' });
    expect(currentResult.interval).toEqual('30m');
    expect(currentResult.searchBounds.min?.toISOString()).toEqual('2024-02-22T00:00:00.000Z');
    expect(currentResult.searchBounds.max?.toISOString()).toEqual('2024-02-23T00:29:59.999Z');
  });
});
