/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isNumber } from 'lodash';
import { LatencyChartsSearchResponse } from '.';
import { Coordinate } from '../../../../typings/timeseries';

type LatencyBuckets = Required<LatencyChartsSearchResponse>['aggregations']['latencyTimeseries']['buckets'];

export function convertLatencyBucketsToCoordinates(
  latencyBuckets: LatencyBuckets = []
) {
  return latencyBuckets.reduce(
    (acc, bucket) => {
      const { '95.0': p95, '99.0': p99 } = bucket.pct.values;

      acc.avg.push({ x: bucket.key, y: bucket.avg.value });
      acc.p95.push({ x: bucket.key, y: isNumber(p95) ? p95 : null });
      acc.p99.push({ x: bucket.key, y: isNumber(p99) ? p99 : null });
      return acc;
    },
    {
      avg: [] as Coordinate[],
      p95: [] as Coordinate[],
      p99: [] as Coordinate[],
    }
  );
}
