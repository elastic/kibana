/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { defaultCore, WrappedHelper } from '../../../../utils/testing';

import { useLocationMonitors } from './use_location_monitors';

describe('useLocationMonitors', () => {
  it('returns expected results', () => {
    const { result } = renderHook(() => useLocationMonitors(), { wrapper: WrappedHelper });

    expect(result.current).toStrictEqual({ locationMonitors: [], loading: false });
    expect(defaultCore.savedObjects.client.find).toHaveBeenCalledWith({
      aggs: {
        locations: {
          terms: { field: 'synthetics-monitor.attributes.locations.id', size: 10000 },
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
            { key: 'Test', doc_count: 5 },
            { key: 'Test 1', doc_count: 0 },
          ],
        },
      },
    });

    const { result, waitForNextUpdate } = renderHook(() => useLocationMonitors(), {
      wrapper: WrappedHelper,
    });

    expect(result.current).toStrictEqual({ locationMonitors: [], loading: true });

    await waitForNextUpdate();

    expect(result.current).toStrictEqual({
      loading: false,
      locationMonitors: [
        {
          id: 'Test',
          count: 5,
        },
        {
          id: 'Test 1',
          count: 0,
        },
      ],
    });
  });
});
