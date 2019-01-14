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
              maximumPercentMemoryUsed: { value: i * 40 },
              averagePercentMemoryUsed: { value: i * 30 }
            }))
        },
        maximumPercentMemoryUsed: { value: 400 },
        averagePercentMemoryUsed: { value: 300 }
      },
      hits: { total: 199 }
    } as ESResponse;

    const result = transform(response);
    expect(result).toMatchSnapshot();

    expect(result.series.maximumPercentMemoryUsed).toHaveLength(10);
    expect(result.series.averagePercentMemoryUsed).toHaveLength(10);

    const overall = Object.keys(result.overallValues);

    expect(overall).toHaveLength(2);
    expect(overall).toEqual(
      expect.arrayContaining([
        'maximumPercentMemoryUsed',
        'averagePercentMemoryUsed'
      ])
    );
  });
});
