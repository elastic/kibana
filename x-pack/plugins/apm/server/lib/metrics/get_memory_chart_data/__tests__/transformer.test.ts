/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESResponse } from '../fetcher';
import { transform } from '../transformer';

describe('memory chart data transformer', () => {
  it('should transform ES data', () => {
    const response = {
      aggregations: {
        timeseriesData: {
          buckets: Array(10)
            .fill(1)
            .map((_, i) => ({
              key: i,
              totalMemory: { value: i * 40 },
              freeMemory: { value: i * 30 },
              processMemorySize: { value: i * 20 },
              processMemoryRss: { value: i * 10 }
            }))
        },
        totalMemory: {
          value: 400
        },
        freeMemory: {
          value: 300
        },
        processMemorySize: {
          value: 200
        },
        processMemoryRss: {
          value: 100
        }
      },
      hits: {
        total: 199
      }
    } as ESResponse;

    const result = transform(response);
    expect(result).toMatchSnapshot();

    expect(result.series.totalMemory).toHaveLength(10);
    expect(result.series.freeMemory).toHaveLength(10);
    expect(result.series.processMemorySize).toHaveLength(10);
    expect(result.series.processMemoryRss).toHaveLength(10);

    expect(Object.keys(result.overallValues)).toEqual([
      'totalMemory',
      'freeMemory',
      'processMemorySize',
      'processMemoryRss'
    ]);
  });
});
