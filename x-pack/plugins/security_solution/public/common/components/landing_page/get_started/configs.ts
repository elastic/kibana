/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema, type TypeOf } from '@kbn/config-schema';

export enum ProductLine {
  security = 'security',
  endpoint = 'endpoint',
  cloud = 'cloud',
}

export enum ProductTier {
  essentials = 'essentials',
  complete = 'complete',
}

export const productLineSchema = schema.oneOf([
  schema.literal(ProductLine.security),
  schema.literal(ProductLine.endpoint),
  schema.literal(ProductLine.cloud),
]);

export type SecurityProductLine = TypeOf<typeof productLineSchema>;

export const productTierSchema = schema.oneOf([
  schema.literal(ProductTier.essentials),
  schema.literal(ProductTier.complete),
]);
export type SecurityProductTier = TypeOf<typeof productTierSchema>;

export const productTypeSchema = schema.object({
  product_line: productLineSchema,
  product_tier: productTierSchema,
});
export type SecurityProductType = TypeOf<typeof productTypeSchema>;

export const productTypesSchema = schema.arrayOf<SecurityProductType>(productTypeSchema, {
  defaultValue: [],
});
export type SecurityProductTypes = TypeOf<typeof productTypesSchema>;

export const ALL_PRODUCT_LINES = Object.values(ProductLine);
