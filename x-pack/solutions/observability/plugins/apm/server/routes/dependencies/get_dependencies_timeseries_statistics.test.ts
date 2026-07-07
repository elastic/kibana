/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DependenciesTimeseriesBuckes } from './get_dependencies_timeseries_statistics';
import { parseDependenciesStats } from './get_dependencies_timeseries_statistics';

describe('parseDependenciesStats', () => {
  const offsetInMs = 1000;

  test('should parse dependency stats correctly with all values', () => {
    const dependencies = [
      {
        key: 'service-A',
        timeseries: {
          buckets: [
            {
              key: 1700000000000,
              doc_count: 10,
              total_count: { value: 10 },
              failures: { total_count: { value: 2 }, doc_count: 2 },
              latency_sum: { value: 5000 },
              latency_count: { value: 10 },
              throughput: { value: 50 },
            },
          ],
        },
      },
    ] as DependenciesTimeseriesBuckes;

    const result = parseDependenciesStats({ dependencies, offsetInMs });

    expect(result).toEqual({
      'service-A': {
        latency: [{ x: 1700000001000, y: 500 }],
        errorRate: [{ x: 1700000001000, y: 0.2 }],
        throughput: [{ x: 1700000001000, y: 50 }],
      },
    });
  });

  test('should handle missing optional values correctly', () => {
    const dependencies = [
      {
        key: 'service-B',
        timeseries: {
          buckets: [
            {
              key: 1700000000000,
              doc_count: 5,
              failures: { doc_count: 1 },
              latency_sum: { value: 2000 },
              latency_count: { value: 5 },
              throughput: {},
            },
          ],
        },
      },
    ] as DependenciesTimeseriesBuckes;

    const result = parseDependenciesStats({ dependencies, offsetInMs });

    expect(result).toEqual({
      'service-B': {
        latency: [{ x: 1700000001000, y: 400 }],
        errorRate: [{ x: 1700000001000, y: 0.2 }],
        throughput: [{ x: 1700000001000, y: undefined }],
      },
    });
  });

  test('should handle missing failures field', () => {
    const dependencies = [
      {
        key: 'service-C',
        timeseries: {
          buckets: [
            {
              key: 1700000000000,
              doc_count: 8,
              failures: { doc_count: 0 },
              total_count: { value: 8 },
              latency_sum: { value: 4000 },
              latency_count: { value: 8 },
              throughput: { value: 30 },
            },
          ],
        },
      },
    ] as DependenciesTimeseriesBuckes;

    const result = parseDependenciesStats({ dependencies, offsetInMs });

    expect(result).toEqual({
      'service-C': {
        latency: [{ x: 1700000001000, y: 500 }],
        errorRate: [{ x: 1700000001000, y: 0 }],
        throughput: [{ x: 1700000001000, y: 30 }],
      },
    });
  });

  test('should return an empty object when dependencies are empty', () => {
    const result = parseDependenciesStats({ dependencies: [], offsetInMs });
    expect(result).toEqual({});
  });
});
