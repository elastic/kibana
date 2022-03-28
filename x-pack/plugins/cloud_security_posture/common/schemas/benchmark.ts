/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { type TypeOf, schema } from '@kbn/config-schema';

export const DEFAULT_BENCHMARKS_PER_PAGE = 20;
export const BENCHMARK_PACKAGE_POLICY_PREFIX = 'package_policy.';
export const benchmarksInputSchema = schema.object({
  /**
   * The page of objects to return
   */
  page: schema.number({ defaultValue: 1, min: 1 }),
  /**
   * The number of objects to include in each page
   */
  per_page: schema.number({ defaultValue: DEFAULT_BENCHMARKS_PER_PAGE, min: 0 }),
  /**
   *  Once of PackagePolicy fields for sorting the found objects.
   *  Sortable fields:
   *    - package_policy.id
   *    - package_policy.name
   *    - package_policy.policy_id
   *    - package_policy.namespace
   *    - package_policy.updated_at
   *    - package_policy.updated_by
   *    - package_policy.created_at
   *    - package_policy.created_by,
   *    - package_policy.package.name
   *    - package_policy.package.title
   *    - package_policy.package.version
   */
  sort_field: schema.oneOf(
    [
      schema.literal('package_policy.id'),
      schema.literal('package_policy.name'),
      schema.literal('package_policy.policy_id'),
      schema.literal('package_policy.namespace'),
      schema.literal('package_policy.updated_at'),
      schema.literal('package_policy.updated_by'),
      schema.literal('package_policy.created_at'),
      schema.literal('package_policy.created_by'),
      schema.literal('package_policy.package.name'),
      schema.literal('package_policy.package.title'),
    ],
    { defaultValue: 'package_policy.name' }
  ),
  /**
   * The order to sort by
   */
  sort_order: schema.oneOf([schema.literal('asc'), schema.literal('desc')], {
    defaultValue: 'asc',
  }),
  /**
   * Benchmark filter
   */
  benchmark_name: schema.maybe(schema.string()),
});

export type BenchmarksQuerySchema = TypeOf<typeof benchmarksInputSchema>;
