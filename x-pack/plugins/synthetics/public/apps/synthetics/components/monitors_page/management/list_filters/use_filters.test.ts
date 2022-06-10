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
          buckets: [{ key: 'Test' }, { key: 'Test 1' }],
        },
        tags: {
          buckets: [{ key: 'Test' }, { key: 'Test 1' }],
        },
        types: {
          buckets: [{ key: 'Test' }, { key: 'Test 1' }],
        },
      },
    });

    const { result, waitForNextUpdate } = renderHook(() => useFilters(), {
      wrapper: WrappedHelper,
    });

    expect(result.current).toStrictEqual({ locations: [], tags: [], types: [] });

    await waitForNextUpdate();

    expect(result.current).toStrictEqual({
      locations: ['Test', 'Test 1'],
      tags: ['Test', 'Test 1'],
      types: ['Test', 'Test 1'],
    });
  });
});
