/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESResponse } from '../fetcher';
import { transform } from '../transformer';

describe('CPU chart data transformer', () => {
  it('should transform ES data', () => {
    const response = {
      aggregations: {
        timeseriesData: {
          buckets: Array(10)
            .fill(1)
            .map((_, i) => ({
              key: i,
              systemCPUAverage: { value: i * 40 },
              systemCPUMax: { value: i * 30 },
              processCPUAverage: { value: i * 20 },
              processCPUMax: { value: i * 10 }
            }))
        },
        systemCPUAverage: {
          value: 400
        },
        systemCPUMax: {
          value: 300
        },
        processCPUAverage: {
          value: 200
        },
        processCPUMax: {
          value: 100
        }
      },
      hits: {
        total: 199
      }
    } as ESResponse;

    const result = transform(response);
    expect(result).toMatchSnapshot();

    expect(result.series.systemCPUAverage).toHaveLength(10);
    expect(result.series.systemCPUMax).toHaveLength(10);
    expect(result.series.processCPUAverage).toHaveLength(10);
    expect(result.series.processCPUMax).toHaveLength(10);

    expect(Object.keys(result.overallValues)).toEqual([
      'systemCPUAverage',
      'systemCPUMax',
      'processCPUAverage',
      'processCPUMax'
    ]);
  });
});
