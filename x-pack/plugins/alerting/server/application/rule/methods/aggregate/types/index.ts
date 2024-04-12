/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AggregationsAggregationContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { TypeOf } from '@kbn/config-schema';
import { KueryNode } from '@kbn/es-query';
import { aggregateOptionsSchema } from '../schemas';

type AggregateOptionsSchemaTypes = TypeOf<typeof aggregateOptionsSchema>;
export type AggregateOptions = TypeOf<typeof aggregateOptionsSchema> & {
  search?: AggregateOptionsSchemaTypes['search'];
  defaultSearchOperator?: AggregateOptionsSchemaTypes['defaultSearchOperator'];
  searchFields?: AggregateOptionsSchemaTypes['searchFields'];
  hasReference?: AggregateOptionsSchemaTypes['hasReference'];
  // Adding filter as in schema it's defined as any instead of KueryNode
  filter?: string | KueryNode;
  page?: AggregateOptionsSchemaTypes['page'];
  perPage?: AggregateOptionsSchemaTypes['perPage'];
  filterConsumers?: string[];
  ruleTypeIds?: string[];
};

export interface AggregateParams<AggregationResult> {
  options?: AggregateOptions;
  aggs: Record<keyof AggregationResult, AggregationsAggregationContainer>;
}

export interface DefaultRuleAggregationParams {
  maxTags?: number;
}

export interface RuleAggregationFormattedResult {
  ruleExecutionStatus: Record<string, number>;
  ruleLastRunOutcome: Record<string, number>;
  ruleEnabledStatus: {
    enabled: number;
    disabled: number;
  };
  ruleMutedStatus: {
    muted: number;
    unmuted: number;
  };
  ruleSnoozedStatus: {
    snoozed: number;
  };
  ruleTags: string[];
}
