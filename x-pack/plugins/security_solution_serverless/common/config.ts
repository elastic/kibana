/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';
import { ProductLine, ProductTier } from './product';

export const productLine = schema.oneOf([
  schema.literal(ProductLine.security),
  schema.literal(ProductLine.endpoint),
  schema.literal(ProductLine.cloud),
]);

export type SecurityProductLine = TypeOf<typeof productLine>;

export const productTier = schema.oneOf([
  schema.literal(ProductTier.essentials),
  schema.literal(ProductTier.complete),
]);
export type SecurityProductTier = TypeOf<typeof productTier>;

export const productType = schema.object({
  product_line: productLine,
  product_tier: productTier,
});
export type SecurityProductType = TypeOf<typeof productType>;

export const productTypes = schema.arrayOf<SecurityProductType>(productType, {
  defaultValue: [],
});
export type SecurityProductTypes = TypeOf<typeof productTypes>;

export const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: false }),
  productTypes,
  /**
   * For internal use. A list of string values (comma delimited) that will enable experimental
   * type of functionality that is not yet released. Valid values for this settings need to
   * be defined in:
   * `x-pack/plugins/security_solution_serverless/common/experimental_features.ts`
   * under the `allowedExperimentalValues` object
   *
   * @example
   * xpack.securitySolutionServerless.enableExperimental:
   *   - someCrazyFeature
   *   - someEvenCrazierFeature
   */
  enableExperimental: schema.arrayOf(schema.string(), {
    defaultValue: () => [],
  }),
});

export type ServerlessSecurityConfigSchema = TypeOf<typeof configSchema>;
