/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { getDefaultRuleAggregation } from './factories/get_default_rule_aggregation/latest';
export { getDefaultRuleAggregation as getDefaultRuleAggregationV1 } from './factories/get_default_rule_aggregation/v1';

export type {
  AggregateOptions,
  AggregateParams,
  GetDefaultRuleAggregationParams,
} from './types/latest';
export type {
  AggregateOptions as AggregateOptionsV1,
  AggregateParams as AggregateParamsV1,
  GetDefaultRuleAggregationParams as GetDefaultRuleAggregationParamsV1,
} from './types/v1';

export { aggregateRules } from './aggregate_rules';
