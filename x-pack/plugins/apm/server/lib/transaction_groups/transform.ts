/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { idx } from '@kbn/elastic-idx';
import { ESResponse } from './fetcher';

function calculateRelativeImpacts(transactionGroups: ITransactionGroup[]) {
  const values = transactionGroups.map(({ impact }) => impact);
  const max = Math.max(...values);
  const min = Math.min(...values);

  return transactionGroups.map(bucket => ({
    ...bucket,
    impact: ((bucket.impact - min) / (max - min)) * 100 || 0
  }));
}

export type ITransactionGroup = ReturnType<typeof getTransactionGroup>;
function getTransactionGroup(
  bucket: ESResponse['aggregations']['transactions']['buckets'][0],
  minutes: number
) {
  const averageResponseTime = bucket.avg.value;
  const transactionsPerMinute = bucket.doc_count / minutes;
  const impact = bucket.sum.value;
  const sample = bucket.sample.hits.hits[0]._source;

  return {
    name: bucket.key,
    sample,
    p95: bucket.p95.values['95.0'],
    averageResponseTime,
    transactionsPerMinute,
    impact
  };
}

export function transactionGroupsTransformer({
  response,
  start,
  end
}: {
  response: ESResponse;
  start: number;
  end: number;
}): ITransactionGroup[] {
  const buckets = idx(response, _ => _.aggregations.transactions.buckets) || [];
  const duration = moment.duration(end - start);
  const minutes = duration.asMinutes();
  const transactionGroups = buckets.map(bucket =>
    getTransactionGroup(bucket, minutes)
  );

  return calculateRelativeImpacts(transactionGroups);
}
