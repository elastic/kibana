/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { orderBy } from 'lodash';
import { ESResponse } from './fetcher';

function calculateRelativeImpacts(items: ITransactionGroup[]) {
  const values = items
    .map(({ impact }) => impact)
    .filter((value) => value !== null) as number[];

  const max = Math.max(...values);
  const min = Math.min(...values);

  return items.map((bucket) => ({
    ...bucket,
    impact:
      bucket.impact !== null
        ? ((bucket.impact - min) / (max - min)) * 100 || 0
        : 0,
  }));
}

const getBuckets = (response: ESResponse) => {
  if (response.aggregations) {
    return orderBy(
      response.aggregations.transaction_groups.buckets,
      ['sum.value'],
      ['desc']
    );
  }
  return [];
};

export type ITransactionGroup = ReturnType<typeof getTransactionGroup>;
function getTransactionGroup(
  bucket: ReturnType<typeof getBuckets>[0],
  minutes: number
) {
  const averageResponseTime = bucket.avg.value;
  const transactionsPerMinute = bucket.doc_count / minutes;
  const impact = bucket.sum.value;
  const sample = bucket.sample.hits.hits[0]._source;

  return {
    name: bucket.key.transaction,
    sample,
    p95: bucket.p95.values['95.0'],
    averageResponseTime,
    transactionsPerMinute,
    impact,
  };
}

export function transactionGroupsTransformer({
  response,
  start,
  end,
  bucketSize,
}: {
  response: ESResponse;
  start: number;
  end: number;
  bucketSize: number;
}): {
  items: ITransactionGroup[];
  isAggregationAccurate: boolean;
  bucketSize: number;
} {
  const buckets = getBuckets(response);
  const duration = moment.duration(end - start);
  const minutes = duration.asMinutes();
  const items = buckets.map((bucket) => getTransactionGroup(bucket, minutes));

  const itemsWithRelativeImpact = calculateRelativeImpacts(items);

  return {
    items: itemsWithRelativeImpact,

    // The aggregation is considered accurate if the configured bucket size is larger or equal to the number of buckets returned
    // the actual number of buckets retrieved are `bucketsize + 1` to detect whether it's above the limit
    isAggregationAccurate: bucketSize >= buckets.length,
    bucketSize,
  };
}
