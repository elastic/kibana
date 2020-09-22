/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TermFilter } from './query_clauses';

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
 *         }
 *       }
 *     }
 *   }
 * }
 *
 * These are referred to as:
 *  (1). AggregationQuery
 *  (2). TermAggregation
 *
 */

export interface AggregationQuery {
  [aggregationName: string]: (TermAggregation | { aggs: AggregationQuery }) & {
    filter?: TermFilter;
  };
}

interface TermAggregation {
  terms: {
    field: string;
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
  key: string;
  doc_count: number;
}

export type AggregationBucketWithSubAgg<Name extends AggregationNames> = AggregationBucket &
  {
    [innerAggregation in Name]: AggregationBuckets<Name>;
  };

export interface AggregationBuckets<Name extends AggregationNames> {
  buckets: AggregationBucket[] | Array<AggregationBucketWithSubAgg<Name>>;
}

export type AggregationResult<Name extends AggregationNames> = {
  [aggregationName in Name]: Aggregation<Name>;
};
