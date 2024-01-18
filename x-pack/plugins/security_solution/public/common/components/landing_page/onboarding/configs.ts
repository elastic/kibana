/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';

/**
 * We do not want serverless code in this plugin. Please Do Not Reuse.
 * This is temporary, will be deleted when issue-174766 is resolved.
 */
export enum ProductLine {
  security = 'security',
  endpoint = 'endpoint',
  cloud = 'cloud',
}
/**
 * We do not want serverless code in this plugin. Please Do Not Reuse.
 * This is temporary, will be deleted when issue-174766 is resolved.
 */
export enum ProductTier {
  essentials = 'essentials',
  complete = 'complete',
}
/**
 * We do not want serverless code in this plugin. Please Do Not Reuse.
 * This is temporary, will be deleted when issue-174766 is resolved.
 */
export const productLineSchema = schema.oneOf([
  schema.literal(ProductLine.security),
  schema.literal(ProductLine.endpoint),
  schema.literal(ProductLine.cloud),
]);

/**
 * We do not want serverless code in this plugin. Please Do Not Reuse.
 * This is temporary, will be deleted when issue-174766 is resolved.
 */
export type SecurityProductLine = TypeOf<typeof productLineSchema>;

/**
 * We do not want serverless code in this plugin. Please Do Not Reuse.
 * This is temporary, will be deleted when issue-174766 is resolved.
 */
export const productTierSchema = schema.oneOf([
  schema.literal(ProductTier.essentials),
  schema.literal(ProductTier.complete),
]);

/**
 * We do not want serverless code in this plugin. Please Do Not Reuse.
 * This is temporary, will be deleted when issue-174766 is resolved.
 */
export type SecurityProductTier = TypeOf<typeof productTierSchema>;

/**
 * We do not want serverless code in this plugin. Please Do Not Reuse.
 * This is temporary, will be deleted when issue-174766 is resolved.
 */
export const productTypeSchema = schema.object({
  product_line: productLineSchema,
  product_tier: productTierSchema,
});

/**
 * We do not want serverless code in this plugin. Please Do Not Reuse.
 * This is temporary, will be deleted when issue-174766 is resolved.
 */
export type SecurityProductType = TypeOf<typeof productTypeSchema>;

/**
 * We do not want serverless code in this plugin. Please Do Not Reuse.
 * This is temporary, will be deleted when issue-174766 is resolved.
 */
export const productTypesSchema = schema.arrayOf<SecurityProductType>(productTypeSchema, {
  defaultValue: [],
});

/**
 * We do not want serverless code in this plugin. Please Do Not Reuse.
 * This is temporary, will be deleted when issue-174766 is resolved.
 */
export type SecurityProductTypes = TypeOf<typeof productTypesSchema>;

/**
 * We do not want serverless code in this plugin. Please Do Not Reuse.
 * This is temporary, will be deleted when issue-174766 is resolved.
 */
export const ALL_PRODUCT_LINES = Object.values(ProductLine);
