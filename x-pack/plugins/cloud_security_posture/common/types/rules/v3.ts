/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';

import { CSPM_POLICY_TEMPLATE, KSPM_POLICY_TEMPLATE } from '../../constants';

const DEFAULT_BENCHMARK_RULES_PER_PAGE = 25;

// Since version 8.7.0
export const cspBenchmarkRuleMetadataSchema = schema.object({
  audit: schema.string(),
  benchmark: schema.object({
    name: schema.string(),
    posture_type: schema.maybe(
      schema.oneOf([schema.literal(CSPM_POLICY_TEMPLATE), schema.literal(KSPM_POLICY_TEMPLATE)])
    ),
    id: schema.string(),
    version: schema.string(),
    rule_number: schema.maybe(schema.string()),
  }),
  default_value: schema.maybe(schema.string()),
  description: schema.string(),
  id: schema.string(),
  impact: schema.maybe(schema.string()),
  name: schema.string(),
  profile_applicability: schema.string(),
  rationale: schema.string(),
  references: schema.maybe(schema.string()),
  rego_rule_id: schema.string(),
  remediation: schema.string(),
  section: schema.string(),
  tags: schema.arrayOf(schema.string()),
  version: schema.string(),
});

export type CspBenchmarkRuleMetadata = TypeOf<typeof cspBenchmarkRuleMetadataSchema>;

export const cspBenchmarkRuleSchema = schema.object({
  metadata: cspBenchmarkRuleMetadataSchema,
});

export type CspBenchmarkRule = TypeOf<typeof cspBenchmarkRuleSchema>;

export const findCspBenchmarkRuleRequestSchema = schema.object({
  /**
   * An Elasticsearch simple_query_string
   */
  search: schema.maybe(schema.string()),

  /**
   * The page of objects to return
   */
  page: schema.number({ defaultValue: 1, min: 1 }),

  /**
   * The number of objects to include in each page
   */
  perPage: schema.number({ defaultValue: DEFAULT_BENCHMARK_RULES_PER_PAGE, min: 0 }),

  /**
   *  Fields to retrieve from CspBenchmarkRule saved object
   */
  fields: schema.maybe(schema.arrayOf(schema.string())),

  /**
   *  The fields to perform the parsed query against.
   * Valid fields are fields which mapped to 'text' in cspBenchmarkRuleSavedObjectMapping
   */
  searchFields: schema.arrayOf(
    schema.oneOf([schema.literal('metadata.name.text'), schema.literal('metadata.section.text')]),
    { defaultValue: ['metadata.name.text'] }
  ),

  /**
   *  Sort Field
   */
  sortField: schema.oneOf(
    [
      schema.literal('metadata.name'),
      schema.literal('metadata.section'),
      schema.literal('metadata.id'),
      schema.literal('metadata.version'),
      schema.literal('metadata.benchmark.id'),
      schema.literal('metadata.benchmark.name'),
      schema.literal('metadata.benchmark.posture_type'),
      schema.literal('metadata.benchmark.version'),
      schema.literal('metadata.benchmark.rule_number'),
    ],
    {
      defaultValue: 'metadata.benchmark.rule_number',
    }
  ),

  /**
   * The order to sort by
   */
  sortOrder: schema.oneOf([schema.literal('asc'), schema.literal('desc')], {
    defaultValue: 'asc',
  }),

  /**
   * benchmark id
   */
  benchmarkId: schema.maybe(
    schema.oneOf([schema.literal('cis_k8s'), schema.literal('cis_eks'), schema.literal('cis_aws')])
  ),

  /**
   * package_policy_id
   */
  packagePolicyId: schema.maybe(schema.string()),

  /**
   * rule section
   */
  section: schema.maybe(schema.string()),
});

export type FindCspBenchmarkRuleRequest = TypeOf<typeof findCspBenchmarkRuleRequestSchema>;

export interface FindCspBenchmarkRuleResponse {
  items: CspBenchmarkRule[];
  total: number;
  page: number;
  perPage: number;
}

export const cspBenchmarkRules = schema.arrayOf(
  schema.object({
    benchmark_id: schema.string(),
    benchmark_version: schema.string(),
    rule_number: schema.string(),
  })
);

export const cspBenchmarkRulesBulkActionRequestSchema = schema.object({
  action: schema.oneOf([schema.literal('mute'), schema.literal('unmute')]),
  rules: cspBenchmarkRules,
});

export type CspBenchmarkRules = TypeOf<typeof cspBenchmarkRules>;

export type CspBenchmarkRulesBulkActionRequestSchema = TypeOf<
  typeof cspBenchmarkRulesBulkActionRequestSchema
>;

const rulesStates = schema.recordOf(
  schema.string(),
  schema.object({
    muted: schema.boolean(),
  })
);

export const cspSettingsSchema = schema.object({
  rules: rulesStates,
});

export type CspBenchmarkRulesStates = TypeOf<typeof rulesStates>;
export type CspSettings = TypeOf<typeof cspSettingsSchema>;
