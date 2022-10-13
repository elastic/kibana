/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
// We are using this inside a `jest.mock` call. Jest requires dynamic dependencies to be prefixed with `mock`
import { coreMock as mockCoreMock } from '@kbn/core/public/mocks';

import { useLogSummary } from './log_summary';

import { fetchLogSummary } from './api/fetch_log_summary';
import { datemathToEpochMillis } from '../../../utils/datemath';

// Typescript doesn't know that `fetchLogSummary` is a jest mock.
// We use a second variable with a type cast to help the compiler further down the line.
jest.mock('./api/fetch_log_summary', () => ({ fetchLogSummary: jest.fn() }));
const fetchLogSummaryMock = fetchLogSummary as jest.MockedFunction<typeof fetchLogSummary>;

jest.mock('../../../hooks/use_kibana', () => ({
  useKibanaContextForPlugin: () => ({ services: mockCoreMock.createStart() }),
}));

describe('useLogSummary hook', () => {
  beforeEach(() => {
    fetchLogSummaryMock.mockClear();
  });

  it('provides an empty list of buckets by default', () => {
    const { result } = renderHook(() => useLogSummary('SOURCE_ID', null, null, null));
    expect(result.current.buckets).toEqual([]);
  });

  it('queries for new summary buckets when the source id changes', async () => {
    const { startTimestamp, endTimestamp } = createMockDateRange();

    const firstMockResponse = createMockResponse([
      { start: startTimestamp, end: endTimestamp, entriesCount: 1 },
    ]);
    const secondMockResponse = createMockResponse([
      { start: startTimestamp, end: endTimestamp, entriesCount: 2 },
    ]);

    fetchLogSummaryMock
      .mockResolvedValueOnce(firstMockResponse)
      .mockResolvedValueOnce(secondMockResponse);

    const { result, waitForNextUpdate, rerender } = renderHook(
      ({ sourceId }) => useLogSummary(sourceId, startTimestamp, endTimestamp, null),
      {
        initialProps: { sourceId: 'INITIAL_SOURCE_ID' },
      }
    );

    await waitForNextUpdate();

    expect(fetchLogSummaryMock).toHaveBeenCalledTimes(1);
    expect(fetchLogSummaryMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        sourceId: 'INITIAL_SOURCE_ID',
      }),
      expect.anything()
    );
    expect(result.current.buckets).toEqual(firstMockResponse.data.buckets);

    rerender({ sourceId: 'CHANGED_SOURCE_ID' });
    await waitForNextUpdate();

    expect(fetchLogSummaryMock).toHaveBeenCalledTimes(2);
    expect(fetchLogSummaryMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        sourceId: 'CHANGED_SOURCE_ID',
      }),
      expect.anything()
    );
    expect(result.current.buckets).toEqual(secondMockResponse.data.buckets);
  });

  it('queries for new summary buckets when the filter query changes', async () => {
    const { startTimestamp, endTimestamp } = createMockDateRange();

    const firstMockResponse = createMockResponse([
      { start: startTimestamp, end: endTimestamp, entriesCount: 1 },
    ]);
    const secondMockResponse = createMockResponse([
      { start: startTimestamp, end: endTimestamp, entriesCount: 2 },
    ]);

    fetchLogSummaryMock
      .mockResolvedValueOnce(firstMockResponse)
      .mockResolvedValueOnce(secondMockResponse);

    const { result, waitForNextUpdate, rerender } = renderHook(
      ({ filterQuery }) => useLogSummary('SOURCE_ID', startTimestamp, endTimestamp, filterQuery),
      {
        initialProps: { filterQuery: 'INITIAL_FILTER_QUERY' },
      }
    );

    await waitForNextUpdate();

    expect(fetchLogSummaryMock).toHaveBeenCalledTimes(1);
    expect(fetchLogSummaryMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        query: 'INITIAL_FILTER_QUERY',
      }),
      expect.anything()
    );
    expect(result.current.buckets).toEqual(firstMockResponse.data.buckets);

    rerender({ filterQuery: 'CHANGED_FILTER_QUERY' });
    await waitForNextUpdate();

    expect(fetchLogSummaryMock).toHaveBeenCalledTimes(2);
    expect(fetchLogSummaryMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        query: 'CHANGED_FILTER_QUERY',
      }),
      expect.anything()
    );
    expect(result.current.buckets).toEqual(secondMockResponse.data.buckets);
  });

  it('queries for new summary buckets when the start and end date changes', async () => {
    fetchLogSummaryMock
      .mockResolvedValueOnce(createMockResponse([]))
      .mockResolvedValueOnce(createMockResponse([]));

    const firstRange = createMockDateRange();
    const { waitForNextUpdate, rerender } = renderHook(
      ({ startTimestamp, endTimestamp }) =>
        useLogSummary('SOURCE_ID', startTimestamp, endTimestamp, null),
      {
        initialProps: firstRange,
      }
    );

    await waitForNextUpdate();
    expect(fetchLogSummaryMock).toHaveBeenCalledTimes(1);
    expect(fetchLogSummaryMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        startTimestamp: firstRange.startTimestamp,
        endTimestamp: firstRange.endTimestamp,
      }),
      expect.anything()
    );

    const secondRange = createMockDateRange('now-20s', 'now');

    rerender(secondRange);
    await waitForNextUpdate();

    expect(fetchLogSummaryMock).toHaveBeenCalledTimes(2);
    expect(fetchLogSummaryMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        startTimestamp: secondRange.startTimestamp,
        endTimestamp: secondRange.endTimestamp,
      }),
      expect.anything()
    );
  });
});

const createMockResponse = (
  buckets: Array<{ start: number; end: number; entriesCount: number }>
) => ({ data: { buckets, start: Number.NEGATIVE_INFINITY, end: Number.POSITIVE_INFINITY } });

const createMockDateRange = (startDate = 'now-10s', endDate = 'now') => {
  return {
    startDate,
    endDate,
    startTimestamp: datemathToEpochMillis(startDate)!,
    endTimestamp: datemathToEpochMillis(endDate, 'up')!,
  };
};
