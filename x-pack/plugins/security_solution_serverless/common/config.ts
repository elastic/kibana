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

/**
 * Developer only options that can be set in `serverless.security.dev.yml`
 */
export const developerConfigSchema = schema.object({
  /**
   * Disables the redirect in the UI for kibana management pages (ex. users, roles, etc).
   *
   * NOTE:  you likely will also need to add the following to your `serverless.security.dev.yml`
   *        file if wanting to access the user, roles and role mapping pages via URL
   *
   * xpack.security.ui.userManagementEnabled: true
   * xpack.security.ui.roleManagementEnabled: true
   * xpack.security.ui.roleMappingManagementEnabled: true
   */
  disableManagementUrlRedirect: schema.boolean({ defaultValue: false }),
});

export type DeveloperConfig = TypeOf<typeof developerConfigSchema>;
