/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GenericBuckets } from '../../../../common/search_strategy/common';

export const DEFAULT_GROUPING_QUERY_ID = 'defaultGroupingQuery';

export type RawBucket = GenericBuckets & {
  alertsCount?: {
    value?: number | null; // Elasticsearch returns `null` when a sub-aggregation cannot be computed
  };
  severitiesSubAggregation?: {
    buckets?: GenericBuckets[];
  };
  countSeveritySubAggregation?: {
    value?: number | null; // Elasticsearch returns `null` when a sub-aggregation cannot be computed
  };
  usersCountAggregation?: {
    value?: number | null; // Elasticsearch returns `null` when a sub-aggregation cannot be computed
  };
  hostsCountAggregation?: {
    value?: number | null; // Elasticsearch returns `null` when a sub-aggregation cannot be computed
  };
  ruleTags?: {
    doc_count_error_upper_bound?: number;
    sum_other_doc_count?: number;
    buckets?: GenericBuckets[];
  };
  stackByMultipleFields1?: {
    buckets?: GenericBuckets[];
    doc_count_error_upper_bound?: number;
    sum_other_doc_count?: number;
  };
};

/** Defines the shape of the aggregation returned by Elasticsearch */
export interface GroupingTableAggregation {
  stackByMupltipleFields0?: {
    buckets?: RawBucket[];
  };
  groupsCount0?: {
    value?: number | null;
  };
}

export type FlattenedBucket = Pick<
  RawBucket,
  'doc_count' | 'key' | 'key_as_string' | 'alertsCount'
> & {
  stackByMultipleFields1Key?: string;
  stackByMultipleFields1DocCount?: number;
};
