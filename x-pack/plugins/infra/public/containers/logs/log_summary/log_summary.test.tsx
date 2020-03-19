/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderHook } from '@testing-library/react-hooks';

import { useLogSummary } from './log_summary';

import { fetchLogSummary } from './api/fetch_log_summary';

// Typescript doesn't know that `fetchLogSummary` is a jest mock.
// We use a second variable with a type cast to help the compiler further down the line.
jest.mock('./api/fetch_log_summary', () => ({ fetchLogSummary: jest.fn() }));
const fetchLogSummaryMock = fetchLogSummary as jest.MockedFunction<typeof fetchLogSummary>;

describe('useLogSummary hook', () => {
  beforeEach(() => {
    fetchLogSummaryMock.mockClear();
  });

  it('provides an empty list of buckets by default', () => {
    const { result } = renderHook(() => useLogSummary('SOURCE_ID', null, 1000, null));
    expect(result.current.buckets).toEqual([]);
  });

  it('queries for new summary buckets when the source id changes', async () => {
    const firstMockResponse = createMockResponse([{ start: 99000, end: 101000, entriesCount: 1 }]);
    const secondMockResponse = createMockResponse([{ start: 99000, end: 101000, entriesCount: 2 }]);

    fetchLogSummaryMock
      .mockResolvedValueOnce(firstMockResponse)
      .mockResolvedValueOnce(secondMockResponse);

    const { result, waitForNextUpdate, rerender } = renderHook(
      ({ sourceId }) => useLogSummary(sourceId, 100000, 1000, null),
      {
        initialProps: { sourceId: 'INITIAL_SOURCE_ID' },
      }
    );

    await waitForNextUpdate();

    expect(fetchLogSummaryMock).toHaveBeenCalledTimes(1);
    expect(fetchLogSummaryMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        sourceId: 'INITIAL_SOURCE_ID',
      })
    );
    expect(result.current.buckets).toEqual(firstMockResponse.data.buckets);

    rerender({ sourceId: 'CHANGED_SOURCE_ID' });
    await waitForNextUpdate();

    expect(fetchLogSummaryMock).toHaveBeenCalledTimes(2);
    expect(fetchLogSummaryMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        sourceId: 'CHANGED_SOURCE_ID',
      })
    );
    expect(result.current.buckets).toEqual(secondMockResponse.data.buckets);
  });

  it('queries for new summary buckets when the filter query changes', async () => {
    const firstMockResponse = createMockResponse([{ start: 99000, end: 101000, entriesCount: 1 }]);
    const secondMockResponse = createMockResponse([{ start: 99000, end: 101000, entriesCount: 2 }]);

    fetchLogSummaryMock
      .mockResolvedValueOnce(firstMockResponse)
      .mockResolvedValueOnce(secondMockResponse);

    const { result, waitForNextUpdate, rerender } = renderHook(
      ({ filterQuery }) => useLogSummary('SOURCE_ID', 100000, 1000, filterQuery),
      {
        initialProps: { filterQuery: 'INITIAL_FILTER_QUERY' },
      }
    );

    await waitForNextUpdate();

    expect(fetchLogSummaryMock).toHaveBeenCalledTimes(1);
    expect(fetchLogSummaryMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        query: 'INITIAL_FILTER_QUERY',
      })
    );
    expect(result.current.buckets).toEqual(firstMockResponse.data.buckets);

    rerender({ filterQuery: 'CHANGED_FILTER_QUERY' });
    await waitForNextUpdate();

    expect(fetchLogSummaryMock).toHaveBeenCalledTimes(2);
    expect(fetchLogSummaryMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        query: 'CHANGED_FILTER_QUERY',
      })
    );
    expect(result.current.buckets).toEqual(secondMockResponse.data.buckets);
  });

  it('queries for new summary buckets when the midpoint time changes', async () => {
    fetchLogSummaryMock
      .mockResolvedValueOnce(createMockResponse([]))
      .mockResolvedValueOnce(createMockResponse([]));

    const { waitForNextUpdate, rerender } = renderHook(
      ({ midpointTime }) => useLogSummary('SOURCE_ID', midpointTime, 1000, null),
      {
        initialProps: { midpointTime: 100000 },
      }
    );

    await waitForNextUpdate();
    expect(fetchLogSummaryMock).toHaveBeenCalledTimes(1);
    expect(fetchLogSummaryMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        startDate: 98500,
        endDate: 101500,
      })
    );

    rerender({ midpointTime: 200000 });
    await waitForNextUpdate();

    expect(fetchLogSummaryMock).toHaveBeenCalledTimes(2);
    expect(fetchLogSummaryMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        startDate: 198500,
        endDate: 201500,
      })
    );
  });

  it('queries for new summary buckets when the interval size changes', async () => {
    fetchLogSummaryMock
      .mockResolvedValueOnce(createMockResponse([]))
      .mockResolvedValueOnce(createMockResponse([]));

    const { waitForNextUpdate, rerender } = renderHook(
      ({ intervalSize }) => useLogSummary('SOURCE_ID', 100000, intervalSize, null),
      {
        initialProps: { intervalSize: 1000 },
      }
    );

    await waitForNextUpdate();
    expect(fetchLogSummaryMock).toHaveBeenCalledTimes(1);
    expect(fetchLogSummaryMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        bucketSize: 10,
        startDate: 98500,
        endDate: 101500,
      })
    );

    rerender({ intervalSize: 2000 });
    await waitForNextUpdate();

    expect(fetchLogSummaryMock).toHaveBeenCalledTimes(2);
    expect(fetchLogSummaryMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        bucketSize: 20,
        startDate: 97000,
        endDate: 103000,
      })
    );
  });
});

const createMockResponse = (
  buckets: Array<{ start: number; end: number; entriesCount: number }>
) => ({ data: { buckets, start: Number.NEGATIVE_INFINITY, end: Number.POSITIVE_INFINITY } });
