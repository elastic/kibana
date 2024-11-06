/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FilterQueryContextProvider, useFilterQueryUpdates } from './use_filters_query';
import { act, renderHook } from '@testing-library/react-hooks';
import { dataPluginMock as mockDataPlugin } from '@kbn/data-plugin/public/mocks';
import type { TimefilterConfig } from '@kbn/data-plugin/public/query';
import { Timefilter } from '@kbn/data-plugin/public/query';
import { useAiopsAppContext } from './use_aiops_app_context';
import { useReload } from './use_reload';

const mockCurrentDate = new Date('2024-02-23T00:13:45.000Z');

jest.mock('./use_aiops_app_context');

jest.mock('./use_reload');

jest.mock('@kbn/ml-date-picker', () => ({
  useTimeRangeUpdates: jest.fn(() => {
    return { from: 'now-24h', to: 'now' };
  }),
}));

jest.mock('@kbn/ml-date-picker', () => ({
  useTimeRangeUpdates: jest.fn(() => {
    return { from: 'now-24h', to: 'now' };
  }),
}));

describe('useFilterQueryUpdates', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(mockCurrentDate);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  test('provides correct search bounds for relative time range on each reload', async () => {
    const mockDataContract = mockDataPlugin.createStartContract();

    const mockTimefilterConfig: TimefilterConfig = {
      timeDefaults: { from: 'now-15m', to: 'now' },
      refreshIntervalDefaults: { pause: false, value: 0 },
      minRefreshIntervalDefault: 1000,
    };

    useAiopsAppContext().data.query.timefilter.timefilter = new Timefilter(
      mockTimefilterConfig,
      mockDataContract.query.timefilter.history,
      // @ts-ignore
      mockDataContract.nowProvider
    );

    const { result, rerender } = renderHook(() => useFilterQueryUpdates(), {
      wrapper: FilterQueryContextProvider,
    });

    const firstResult = result.current;

    expect(firstResult.timeRange).toEqual({ from: 'now-24h', to: 'now' });
    expect(firstResult.interval).toEqual('30m');
    expect(firstResult.searchBounds.min?.toISOString()).toEqual('2024-02-22T00:00:00.000Z');
    expect(firstResult.searchBounds.max?.toISOString()).toEqual('2024-02-23T00:29:59.999Z');

    act(() => {
      // 30 minutes later...
      const nextMockDate = new Date('2024-02-23T00:53:45.000Z');
      jest.setSystemTime(nextMockDate);

      (useReload as jest.MockedFunction<typeof useReload>).mockReturnValue({
        refreshTimestamp: nextMockDate.getTime(),
      });

      rerender();
    });

    const secondResult = result.current;
    expect(secondResult.timeRange).toEqual({ from: 'now-24h', to: 'now' });
    expect(secondResult.interval).toEqual('30m');
    expect(secondResult.searchBounds.min?.toISOString()).toEqual('2024-02-22T00:30:00.000Z');
    expect(secondResult.searchBounds.max?.toISOString()).toEqual('2024-02-23T00:59:59.999Z');
  });
});
