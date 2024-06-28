/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AggregationsAggregationContainer,
  AggregationsCompositeAggregation,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { AggregateOptions } from '../server/application/rule/methods/aggregate/types';

export type RuleTagsAggregationOptions = Pick<AggregateOptions, 'filter' | 'search'> & {
  after?: AggregationsCompositeAggregation['after'];
  maxTags?: number;
};

export interface RuleTagsAggregationFormattedResult {
  ruleTags: string[];
}

export interface RuleTagsAggregationResult {
  tags: {
    buckets: Array<{
      key: {
        tags: string;
      };
      doc_count: number;
    }>;
  };
}

interface GetRuleTagsAggregationParams {
  maxTags?: number;
  after?: AggregationsCompositeAggregation['after'];
}

export const getRuleTagsAggregation = (
  params?: GetRuleTagsAggregationParams
): Record<string, AggregationsAggregationContainer> => {
  const { maxTags = 50, after } = params || {};
  return {
    tags: {
      composite: {
        ...(after ? { after } : {}),
        size: maxTags,
        sources: [
          {
            tags: {
              terms: {
                field: 'alert.attributes.tags',
                order: 'asc' as const,
              },
            },
          },
        ],
      },
    },
  };
};

export const formatRuleTagsAggregationResult = (
  aggregations: RuleTagsAggregationResult
): RuleTagsAggregationFormattedResult => {
  if (!aggregations) {
    return {
      ruleTags: [],
    };
  }
  const tagsBuckets = aggregations.tags.buckets || [];
  return {
    ruleTags: tagsBuckets.map((bucket) => bucket.key.tags),
  };
};
