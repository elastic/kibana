/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sortBy } from 'lodash';
import { NOT_AVAILABLE_LABEL } from '../../../../common/i18n';
import { ThroughputChartsResponse } from '.';
import {
  calculateThroughput,
  getThroughputUnit,
} from '../../../../common/calculate_throughput';
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

  const throughputUnit = getThroughputUnit(bucketSize);

  const buckets = throughputResultBuckets.map(
    ({ key: resultKey, timeseries }) => {
      const dataPoints = timeseries.buckets.map((bucket) => {
        const { value } = calculateThroughput({
          unit: throughputUnit,
          bucketSize,
          count: bucket.doc_count,
        });

        return {
          x: bucket.key,
          y: value,
        };
      });

      // Handle empty string result keys
      const key =
        resultKey === '' ? NOT_AVAILABLE_LABEL : (resultKey as string);

      const docCountTotal = timeseries.buckets
        .map((bucket) => bucket.doc_count)
        .reduce((a, b) => a + b, 0);

      // calculate average throughput
      const avg = calculateThroughput({
        unit: throughputUnit,
        start,
        end,
        count: docCountTotal,
      });

      return { key, dataPoints, avg };
    }
  );

  return {
    unit: throughputUnit,
    buckets: sortBy(
      buckets,
      (bucket) => bucket.key.toString().replace(/^HTTP (\d)xx$/, '00$1') // ensure that HTTP status codes like 3xx, 4xx are sorted at the top
    ),
  };
}
