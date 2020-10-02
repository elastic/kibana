/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { keyBy } from 'lodash';
import { TermFilter, RangeFilter } from './query_clauses';

/**
 * Terminology
 * ===========
 * The terms for the different clauses in an Elasticsearch query aggregation can be confusing, here are some
 * clarifications that might help you understand the Typescript types we use here.
 *
 * Given the following Aggregation:
 * {
 *   "size": 0,
 *   "aggs": { (1)
 *     "task": {
 *       "filter": {
 *         "term": {
 *           "type": "task"
 *         }
 *       },
 *       "aggs": { (1)
 *         "taskType": { (2)
 *           "terms": { "field": "task.taskType" },
 *           "aggs": {
 *             "status": { (2)
 *               "terms": { "field": "task.status" }
 *             }
 *           }
 *         },
 *         "scheduleDensity": {
 *          "range": { (3)
 *            "field": "task.runAt",
 *            "keyed": true,
 *            "ranges": [
 *              { "key": "overdue", "from": "now-1m", "to": "now" },
 *              { "key": "upcoming", "from": "now+1s", "to": "now+1m" }
 *            ]
 *          },
 *          "aggs": {
 *            "histogram": { (4)
 *              "date_histogram": {
 *                "field": "task.runAt",
 *                "fixed_interval": "3s"
 *              }
 *            }
 *          }
 *        }
 *       }
 *     }
 *   }
 * }
 *
 * These are referred to as:
 *  (1). AggregationQuery
 *  (2). TermAggregation
 *  (3). RangeAggregation
 *  (4). HistogramAggregation
 *
 */

export interface AggregationQuery {
  [aggregationName: string]: TypedAggregation & { aggs?: AggregationQuery };
}

type TypedAggregation =
  | TermAggregation
  | FilterAggregation
  | RangeAggregation
  | RangeAggregation
  | HistogramAggregation;

interface TermAggregation {
  terms: {
    field: string;
  };
}

interface FilterAggregation {
  filter: TermFilter | RangeFilter;
}

interface RangeAggregation {
  range: {
    field: string;
    keyed?: boolean;
    ranges: Array<{ key?: string; from?: string; to?: string }>;
  };
}

interface HistogramAggregation {
  date_histogram: {
    field: string;
    fixed_interval: string;
    keyed?: boolean;
  };
}

/**
 * Results of an Aggregation
 */
type ReservedNames = 'doc_count';
type AggregationNames = Exclude<string, ReservedNames>;
export type Aggregation<Name extends AggregationNames> = {
  doc_count: number;
} & {
  [innerAggregation in Name]: AggregationBuckets<Name>;
};

export interface AggregationBucket {
  doc_count: number;
}

export function isAggregationBucket(bucket: unknown): bucket is AggregationBucket {
  return typeof (bucket as AggregationBucket)?.doc_count === 'number';
}

export function isBucketsWithNumericKey<Name extends AggregationNames>(
  buckets: AggregationBuckets<Name>['buckets']
): buckets is Array<
  AggregationBucket & {
    key_as_string: string;
    key: number;
  }
> {
  return (
    !isKeyedBuckets(buckets) && typeof (buckets[0] as KeyedAggregationBucket)?.key === 'number'
  );
}

export type KeyedAggregationBucket = AggregationBucket &
  (
    | {
        key: string;
      }
    | {
        key_as_string: string;
        key: number;
      }
  );

export function getStringKeyOfBucket(bucket: KeyedAggregationBucket) {
  return typeof bucket.key === 'string'
    ? bucket.key
    : (bucket as {
        key_as_string: string;
      }).key_as_string;
}

export interface RangeAggregationBucket {
  from: number;
  to: number;
  doc_count: number;
}

export type KeyedRangeAggregationBucket = RangeAggregationBucket & {
  key: string;
};

export function isRangeAggregationBucket(bucket: TypedBucket): bucket is RangeAggregationBucket {
  return (
    typeof (bucket as RangeAggregationBucket).to !== 'number' ||
    typeof (bucket as RangeAggregationBucket).from !== 'number'
  );
}

type TypedBucket = AggregationBucket | RangeAggregationBucket;
type KeyedTypedBucket = KeyedAggregationBucket | KeyedRangeAggregationBucket;

export type AggregationBucketWithSubAgg<
  Name extends AggregationNames,
  AggType extends TypedBucket = TypedBucket
> = AggType &
  {
    [innerAggregation in Name]: AggregationBuckets<Name>;
  };

export type KeyedBuckets<Name extends AggregationNames> = Record<
  Name,
  TypedBucket | AggregationBucketWithSubAgg<Name>
>;

export interface AggregationBuckets<Name extends AggregationNames> {
  buckets: KeyedTypedBucket[] | Array<AggregationBucketWithSubAgg<Name>> | KeyedBuckets<Name>;
}

export function isKeyedBuckets<Name extends AggregationNames>(
  buckets: AggregationBuckets<Name>['buckets']
): buckets is KeyedBuckets<Name> {
  return !Array.isArray(buckets);
}

export function aggregationBucketsByKey<Name extends AggregationNames>({
  buckets,
}: AggregationBuckets<Name>): KeyedBuckets<Name> {
  if (isKeyedBuckets(buckets)) {
    return buckets;
  }
  return keyBy(buckets, 'key') as KeyedBuckets<Name>;
}

export type AggregationResult<Name extends AggregationNames> = {
  [aggregationName in Name]: Aggregation<Name> | AggregationBuckets<Name>;
};

export function isBucketedAggregation<Name extends AggregationNames>(
  aggregation: Aggregation<Name> | AggregationBuckets<Name>
): aggregation is AggregationBuckets<Name> {
  return aggregation && Array.isArray((aggregation as AggregationBuckets<Name>).buckets);
}

export interface AggregationSearchResult<Name extends AggregationNames> {
  sum: number;
  aggregations: AggregationResult<Name>;
}
