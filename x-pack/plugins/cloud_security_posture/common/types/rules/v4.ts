/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { BenchmarksCisId } from '../latest';

export type {
  cspBenchmarkRuleMetadataSchema,
  CspBenchmarkRuleMetadata,
  cspBenchmarkRuleSchema,
  CspBenchmarkRule,
  FindCspBenchmarkRuleResponse,
  CspSettings,
  CspBenchmarkRulesStates,
} from './v3';

const DEFAULT_BENCHMARK_RULES_PER_PAGE = 25;

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
    schema.oneOf([
      schema.literal('cis_k8s'),
      schema.literal('cis_eks'),
      schema.literal('cis_aws'),
      schema.literal('cis_azure'),
      schema.literal('cis_gcp'),
    ])
  ),

  /**
   * benchmark version
   */
  benchmarkVersion: schema.maybe(schema.string()),

  /**
   * rule section
   */
  section: schema.maybe(schema.string()),
  ruleNumber: schema.maybe(schema.string()),
});

export type FindCspBenchmarkRuleRequest = TypeOf<typeof findCspBenchmarkRuleRequestSchema>;

export interface BenchmarkRuleSelectParams {
  section?: string;
  ruleNumber?: string;
}

export interface PageUrlParams {
  benchmarkId: BenchmarksCisId;
  benchmarkVersion: string;
}
