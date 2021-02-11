/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sortBy } from 'lodash';
import { NOT_AVAILABLE_LABEL } from '../../../../common/i18n';
import { ThroughputChartsResponse } from '.';
import { calculateThroughput } from '../../helpers/calculate_throughput';
import { SetupTimeRange } from '../../helpers/setup_request';

type ThroughputResultBuckets = Required<ThroughputChartsResponse>['aggregations']['throughput']['buckets'];

export function getThroughputBuckets({
  throughputResultBuckets = [],
  bucketSize,
  setupTimeRange,
}: {
  throughputResultBuckets?: ThroughputResultBuckets;
  bucketSize: number;
  setupTimeRange: SetupTimeRange;
}) {
  const { start, end } = setupTimeRange;
  const buckets = throughputResultBuckets.map(
    ({ key: resultKey, timeseries }) => {
      const dataPoints = timeseries.buckets.map((bucket) => {
        return {
          x: bucket.key,
          // divide by minutes
          y: bucket.doc_count / (bucketSize / 60),
        };
      });

      // Handle empty string result keys
      const key =
        resultKey === '' ? NOT_AVAILABLE_LABEL : (resultKey as string);

      const docCountTotal = timeseries.buckets
        .map((bucket) => bucket.doc_count)
        .reduce((a, b) => a + b, 0);

      // calculate average throughput
      const avg = calculateThroughput({ start, end, value: docCountTotal });

      return { key, dataPoints, avg };
    }
  );

  return sortBy(
    buckets,
    (bucket) => bucket.key.toString().replace(/^HTTP (\d)xx$/, '00$1') // ensure that HTTP 3xx are sorted at the top
  );
}
