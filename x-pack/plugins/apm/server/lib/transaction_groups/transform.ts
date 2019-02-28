/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { idx } from 'x-pack/plugins/apm/common/idx';
import { Transaction } from 'x-pack/plugins/apm/typings/es_schemas/Transaction';
import { ESResponse } from './fetcher';

export interface ITransactionGroup {
  name: string;
  sample: Transaction;
  p95: number;
  averageResponseTime: number;
  transactionsPerMinute: number;
  impact: number;
}

function calculateRelativeImpacts(results: ITransactionGroup[]) {
  const values = results.map(({ impact }) => impact);
  const max = Math.max(...values);
  const min = Math.min(...values);

  return results.map(bucket => ({
    ...bucket,
    impact: ((bucket.impact - min) / (max - min)) * 100 || 0
  }));
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
  const results = buckets.map(bucket => {
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
  });

  return calculateRelativeImpacts(results);
}
