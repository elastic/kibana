/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationsAggregationContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { KueryNode } from '@kbn/es-query';

export interface AggregateOptions {
  search?: string;
  defaultSearchOperator?: 'AND' | 'OR';
  searchFields?: string[];
  hasReference?: {
    type: string;
    id: string;
  };
  filter?: string | KueryNode;
  page?: number;
  perPage?: number;
}

export interface AggregateParams<AggregationResult> {
  options?: AggregateOptions;
  aggs: Record<keyof AggregationResult, AggregationsAggregationContainer>;
}

export interface DefaultRuleAggregationResult {
  status: {
    buckets: Array<{
      key: string;
      doc_count: number;
    }>;
  };
  outcome: {
    buckets: Array<{
      key: string;
      doc_count: number;
    }>;
  };
  muted: {
    buckets: Array<{
      key: number;
      key_as_string: string;
      doc_count: number;
    }>;
  };
  enabled: {
    buckets: Array<{
      key: number;
      key_as_string: string;
      doc_count: number;
    }>;
  };
  snoozed: {
    count: {
      doc_count: number;
    };
  };
  tags: {
    buckets: Array<{
      key: string;
      doc_count: number;
    }>;
  };
}

export interface GetDefaultRuleAggregationParams {
  maxTags?: number;
}
