/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useFilters } from './use_filters';
import { defaultCore, WrappedHelper } from '../../../../utils/testing';

describe('useMonitorListFilters', () => {
  it('returns expected results', () => {
    const { result } = renderHook(() => useFilters(), { wrapper: WrappedHelper });

    expect(result.current).toStrictEqual({ locations: [], tags: [], types: [] });
    expect(defaultCore.savedObjects.client.find).toHaveBeenCalledWith({
      aggs: {
        locations: {
          terms: { field: 'synthetics-monitor.attributes.locations.id', size: 10000 },
        },
        tags: {
          terms: { field: 'synthetics-monitor.attributes.tags', size: 10000 },
        },
        types: {
          terms: { field: 'synthetics-monitor.attributes.type.keyword', size: 10000 },
        },
      },
      perPage: 0,
      type: 'synthetics-monitor',
    });
  });

  it('returns expected results after data', async () => {
    defaultCore.savedObjects.client.find = jest.fn().mockReturnValue({
      aggregations: {
        locations: {
          buckets: [
            { key: 'Test 1', doc_count: 1 },
            { key: 'Test 2', doc_count: 2 },
          ],
        },
        tags: {
          buckets: [
            { key: 'Test 3', doc_count: 3 },
            { key: 'Test 4', doc_count: 4 },
          ],
        },
        types: {
          buckets: [
            { key: 'Test 5', doc_count: 5 },
            { key: 'Test 6', doc_count: 6 },
          ],
        },
      },
    });

    const { result, waitForNextUpdate } = renderHook(() => useFilters(), {
      wrapper: WrappedHelper,
    });

    expect(result.current).toStrictEqual({ locations: [], tags: [], types: [] });

    await waitForNextUpdate();

    expect(result.current).toStrictEqual({
      locations: [
        { label: 'Test 1', count: 1 },
        { label: 'Test 2', count: 2 },
      ],
      tags: [
        { label: 'Test 3', count: 3 },
        { label: 'Test 4', count: 4 },
      ],
      types: [
        { label: 'Test 5', count: 5 },
        { label: 'Test 6', count: 6 },
      ],
    });
  });
});
