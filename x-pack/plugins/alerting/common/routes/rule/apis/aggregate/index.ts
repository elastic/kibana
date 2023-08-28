/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export {
  aggregateRulesRequestBodySchema,
  ruleAggregationFormattedResultSchema,
} from './schemas/latest';
export type { AggregateRulesRequestBody, RuleAggregationFormattedResult } from './types/latest';

export {
  aggregateRulesRequestBodySchema as aggregateRulesRequestBodySchemaV1,
  ruleAggregationFormattedResultSchema as ruleAggregationFormattedResultSchemaV1,
} from './schemas/v1';
export type {
  AggregateRulesRequestBody as AggregateRulesRequestBodyV1,
  RuleAggregationFormattedResult as RuleAggregationFormattedResultV1,
} from './types/v1';
