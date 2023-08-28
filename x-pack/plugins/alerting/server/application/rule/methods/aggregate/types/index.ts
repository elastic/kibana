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

export interface GetDefaultRuleAggregationParams {
  maxTags?: number;
}
