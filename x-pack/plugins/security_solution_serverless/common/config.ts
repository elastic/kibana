/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

export enum ProductLine {
  security = 'security',
  cloud = 'cloud',
  endpoint = 'endpoint',
}

export const productLine = schema.oneOf([
  schema.literal(ProductLine.security),
  schema.literal(ProductLine.endpoint),
  schema.literal(ProductLine.cloud),
]);

export type SecurityProductLine = TypeOf<typeof productLine>;

export const productTier = schema.oneOf([schema.literal('essentials'), schema.literal('complete')]);
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
