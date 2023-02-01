/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AggregationsAggregationContainer,
  AggregationsCompositeAggregation,
  AggregationsAggregateOrder,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { AggregateOptions } from '../rules_client/types';

export type RuleTagsAggregationOptions = Pick<
  AggregateOptions,
  'filter' | 'maxTags' | 'search' | 'searchFields' | 'defaultSearchOperator'
> & {
  after?: AggregationsCompositeAggregation['after'];
};

export interface RuleTagsAggregateResult {
  ruleTags: string[];
}

export interface RuleTagsAggregation extends Record<string, unknown> {
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

export const getRuleTagsAggregation = ({
  maxTags = 50,
  after,
}: GetRuleTagsAggregationParams): Record<string, AggregationsAggregationContainer> => {
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
                order: 'asc' as unknown as AggregationsAggregateOrder,
              },
            },
          },
        ],
      },
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
  const tagsBuckets = aggregations.tags.buckets || [];
  return {
    ruleTags: tagsBuckets.map((bucket) => bucket.key.tags),
  };
};
