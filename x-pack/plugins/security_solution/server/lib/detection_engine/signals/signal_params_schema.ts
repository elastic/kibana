/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';

import { DEFAULT_MAX_SIGNALS } from '../../../../common/constants';

export const signalSchema = schema.object({
  anomalyThreshold: schema.maybe(schema.number()),
  author: schema.arrayOf(schema.string(), { defaultValue: [] }),
  buildingBlockType: schema.nullable(schema.string()),
  description: schema.string(),
  note: schema.nullable(schema.string()),
  eventCategoryOverride: schema.maybe(schema.string()),
  falsePositives: schema.arrayOf(schema.string(), { defaultValue: [] }),
  from: schema.string(),
  ruleId: schema.string(),
  immutable: schema.boolean({ defaultValue: false }),
  index: schema.nullable(schema.arrayOf(schema.string())),
  language: schema.nullable(schema.string()),
  license: schema.nullable(schema.string()),
  outputIndex: schema.nullable(schema.string()),
  savedId: schema.nullable(schema.string()),
  timelineId: schema.nullable(schema.string()),
  timelineTitle: schema.nullable(schema.string()),
  meta: schema.nullable(schema.object({}, { unknowns: 'allow' })),
  machineLearningJobId: schema.maybe(schema.string()),
  query: schema.nullable(schema.string()),
  filters: schema.nullable(schema.arrayOf(schema.object({}, { unknowns: 'allow' }))),
  maxSignals: schema.number({ defaultValue: DEFAULT_MAX_SIGNALS }),
  riskScore: schema.number(),
  // TODO: Specify types explicitly since they're known?
  riskScoreMapping: schema.nullable(schema.arrayOf(schema.object({}, { unknowns: 'allow' }))),
  ruleNameOverride: schema.nullable(schema.string()),
  severity: schema.string(),
  severityMapping: schema.nullable(schema.arrayOf(schema.object({}, { unknowns: 'allow' }))),
  threat: schema.nullable(schema.arrayOf(schema.object({}, { unknowns: 'allow' }))),
  threshold: schema.maybe(
    schema.object({
      field: schema.nullable(schema.oneOf([schema.string(), schema.arrayOf(schema.string())])),
      value: schema.number(),
      cardinality_field: schema.nullable(schema.string()), // TODO: depends on `field` being defined?
      cardinality_value: schema.nullable(schema.number()),
    })
  ),
  timestampOverride: schema.nullable(schema.string()),
  to: schema.string(),
  type: schema.string(),
  references: schema.arrayOf(schema.string(), { defaultValue: [] }),
  version: schema.number({ defaultValue: 1 }),
  lists: schema.maybe(schema.arrayOf(schema.object({}, { unknowns: 'allow' }))), // For backwards compatibility with customers that had a data bug in 7.7. Once we use a migration script please remove this.
  exceptions_list: schema.maybe(schema.arrayOf(schema.object({}, { unknowns: 'allow' }))), // For backwards compatibility with customers that had a data bug in 7.8. Once we use a migration script please remove this.
  exceptionsList: schema.maybe(schema.arrayOf(schema.object({}, { unknowns: 'allow' }))),
  threatFilters: schema.nullable(schema.arrayOf(schema.object({}, { unknowns: 'allow' }))),
  threatIndex: schema.maybe(schema.arrayOf(schema.string())),
  threatIndicatorPath: schema.maybe(schema.string()),
  threatQuery: schema.maybe(schema.string()),
  threatMapping: schema.maybe(schema.arrayOf(schema.object({}, { unknowns: 'allow' }))),
  threatLanguage: schema.maybe(schema.string()),
  concurrentSearches: schema.maybe(schema.number()),
  itemsPerSearch: schema.maybe(schema.number()),
});

/**
 * This is the schema for the Alert Rule that represents the SIEM alert for signals
 * that index into the .siem-signals-${space-id}
 */
export const signalParamsSchema = () => signalSchema;

export type SignalParamsSchema = TypeOf<typeof signalSchema>;
