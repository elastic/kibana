/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const aggregateRulesRequestBodySchema = schema.object({
  search: schema.maybe(schema.string()),
  default_search_operator: schema.oneOf([schema.literal('OR'), schema.literal('AND')], {
    defaultValue: 'OR',
  }),
  search_fields: schema.maybe(schema.arrayOf(schema.string())),
  has_reference: schema.maybe(
    // use nullable as maybe is currently broken
    // in config-schema
    schema.nullable(
      schema.object({
        type: schema.string(),
        id: schema.string(),
      })
    )
  ),
  filter: schema.maybe(schema.string()),
});

export const ruleAggregationFormattedResultSchema = schema.object({
  ruleExecutionStatus: schema.recordOf(schema.string(), schema.number()),
  ruleLastRunOutcome: schema.recordOf(schema.string(), schema.number()),
  ruleEnabledStatus: schema.object({
    enabled: schema.number(),
    disabled: schema.number(),
  }),
  ruleMutedStatus: schema.object({
    muted: schema.number(),
    unmuted: schema.number(),
  }),
  ruleSnoozedStatus: schema.object({
    snoozed: schema.number(),
  }),
  ruleTags: schema.arrayOf(schema.string()),
});
