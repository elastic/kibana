/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import {
  TRANSACTION_DURATION,
  TRANSACTION_NAME
} from '../../../common/constants';
import { Transaction } from '../../../typings/Transaction';
import { ITransactionGroup } from '../../../typings/TransactionGroup';

export interface ITransactionGroupBucket {
  key: string;
  doc_count: number;
  avg: {
    value: number;
  };
  p95: {
    values: {
      '95.0': number;
    };
  };
  sample: {
    hits: {
      hits: Array<{
        _source: Transaction;
      }>;
    };
  };
}

export const TRANSACTION_GROUP_AGGREGATES = {
  transactions: {
    terms: {
      field: `${TRANSACTION_NAME}.keyword`,
      order: { avg: 'desc' },
      size: 100
    },
    aggs: {
      sample: {
        top_hits: {
          size: 1,
          sort: [{ '@timestamp': { order: 'desc' } }]
        }
      },
      avg: { avg: { field: TRANSACTION_DURATION } },
      p95: { percentiles: { field: TRANSACTION_DURATION, percents: [95] } }
    }
  }
};

function calculateRelativeImpacts(results: ITransactionGroup[]) {
  const values = results.map(({ impact }) => impact);
  const max = Math.max(...values);
  const min = Math.min(...values);

  return results.map(bucket => ({
    ...bucket,
    impact: ((bucket.impact - min) / (max - min)) * 100
  }));
}

export function prepareTransactionGroups({
  buckets,
  start,
  end
}: {
  buckets: ITransactionGroupBucket[];
  start: number;
  end: number;
}) {
  const duration = moment.duration(end - start);
  const minutes = duration.asMinutes();

  const results = buckets.map((bucket: ITransactionGroupBucket) => {
    const averageResponseTime = bucket.avg.value;
    const transactionsPerMinute = bucket.doc_count / minutes;
    const impact = Math.round(averageResponseTime * transactionsPerMinute);
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
