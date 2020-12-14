/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { sortBy } from 'lodash';
import { NOT_AVAILABLE_LABEL } from '../../../../common/i18n';
import { ThroughputChartsResponse } from '.';

type ThroughputResultBuckets = Required<ThroughputChartsResponse>['aggregations']['throughput']['buckets'];

export function getThroughputBuckets({
  throughputResultBuckets = [],
  bucketSize,
  durationAsMinutes,
}: {
  throughputResultBuckets?: ThroughputResultBuckets;
  bucketSize: number;
  durationAsMinutes: number;
}) {
  const buckets = throughputResultBuckets.map(
    ({ key: resultKey, timeseries }) => {
      const dataPoints = timeseries.buckets.map((bucket) => {
        return {
          x: bucket.key,
          // divide by minutes
          y: bucket.count.value / (bucketSize / 60),
        };
      });

      // Handle empty string result keys
      const key =
        resultKey === '' ? NOT_AVAILABLE_LABEL : (resultKey as string);

      const docCountTotal = timeseries.buckets
        .map((bucket) => bucket.count.value)
        .reduce((a, b) => a + b, 0);

      // calculate request/minute
      const avg = docCountTotal / durationAsMinutes;

      return { key, dataPoints, avg };
    }
  );

  return sortBy(
    buckets,
    (bucket) => bucket.key.toString().replace(/^HTTP (\d)xx$/, '00$1') // ensure that HTTP 3xx are sorted at the top
  );
}
