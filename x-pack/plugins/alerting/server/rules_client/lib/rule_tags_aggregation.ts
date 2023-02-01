/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationsAggregationContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { AggregateOptions } from '../types';

export type RuleTagsAggregationOptions = Pick<
  AggregateOptions,
  'filter' | 'perPage' | 'page' | 'maxTags'
>;

export interface RuleTagsAggregateResult {
  ruleTags: string[];
}

export interface RuleTagsAggregation extends Record<string, unknown> {
  tags: {
    buckets: Array<{
      key: string;
      doc_count: number;
    }>;
  };
}

export const getRuleTagsAggregation = (
  maxTags: number = 50
): Record<string, AggregationsAggregationContainer> => {
  return {
    tags: {
      terms: { field: 'alert.attributes.tags', order: { _key: 'asc' }, size: maxTags },
    },
  };
};

export const formatRuleTagsAggregationResult = (
  aggregations?: RuleTagsAggregation
): RuleTagsAggregateResult => {
  if (!aggregations) {
    return {
      ruleTags: [],
    };
  }
  const tagsBuckets = aggregations.tags?.buckets || [];
  return {
    ruleTags: tagsBuckets.map((bucket) => bucket.key),
  };
};
