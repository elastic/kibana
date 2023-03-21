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

    expect(result.current).toStrictEqual({
      locations: [],
      tags: [],
      monitorTypes: [],
      projects: [],
      schedules: [],
    });
    expect(defaultCore.savedObjects.client.find).toHaveBeenCalledWith({
      aggs: {
        locations: {
          terms: { field: 'synthetics-monitor.attributes.locations.id', size: 10000 },
        },
        monitorTypes: {
          terms: { field: 'synthetics-monitor.attributes.type.keyword', size: 10000 },
        },
        projects: {
          terms: { field: 'synthetics-monitor.attributes.project_id', size: 10000 },
        },
        schedules: {
          terms: { field: 'synthetics-monitor.attributes.schedule.number', size: 10000 },
        },
        tags: {
          terms: { field: 'synthetics-monitor.attributes.tags', size: 10000 },
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
        monitorTypes: {
          buckets: [
            { key: 'Test 3', doc_count: 3 },
            { key: 'Test 4', doc_count: 4 },
          ],
        },
        projects: {
          buckets: [
            { key: 'Test 5', doc_count: 5 },
            { key: 'Test 6', doc_count: 6 },
          ],
        },
        schedules: {
          buckets: [
            { key: 'Test 7', doc_count: 7 },
            { key: 'Test 8', doc_count: 8 },
          ],
        },
        tags: {
          buckets: [
            { key: 'Test 9', doc_count: 9 },
            { key: 'Test 10', doc_count: 10 },
          ],
        },
      },
    });

    const { result, waitForNextUpdate } = renderHook(() => useFilters(), {
      wrapper: WrappedHelper,
    });

    expect(result.current).toStrictEqual({
      locations: [],
      tags: [],
      monitorTypes: [],
      projects: [],
      schedules: [],
    });

    await waitForNextUpdate();

    expect(result.current).toStrictEqual({
      locations: [
        { label: 'Test 1', count: 1 },
        { label: 'Test 2', count: 2 },
      ],
      monitorTypes: [
        { label: 'Test 3', count: 3 },
        { label: 'Test 4', count: 4 },
      ],
      projects: [
        { label: 'Test 5', count: 5 },
        { label: 'Test 6', count: 6 },
      ],
      schedules: [
        { label: 'Test 7', count: 7 },
        { label: 'Test 8', count: 8 },
      ],
      tags: [
        { label: 'Test 9', count: 9 },
        { label: 'Test 10', count: 10 },
      ],
    });
  });
});
