/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AggregationsBuckets,
  AggregationsStringTermsBucketKeys,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { replaceDotSymbols } from './replace_dots_with_underscores';

export function parseSimpleRuleTypeBucket(
  ruleTypeBuckets: AggregationsBuckets<AggregationsStringTermsBucketKeys>
) {
  const buckets = ruleTypeBuckets as AggregationsStringTermsBucketKeys[];
  return (buckets ?? []).reduce((acc, bucket: AggregationsStringTermsBucketKeys) => {
    const ruleType: string = replaceDotSymbols(bucket.key);
    return {
      ...acc,
      [ruleType]: bucket.doc_count ?? 0,
    };
  }, {});
}
