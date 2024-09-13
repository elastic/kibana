/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
export type SecurityProductTypes = Array<{
  product_line: ProductLine;
  product_tier: ProductTier;
}>;

/**
 * We do not want serverless code in this plugin. Please Do Not Reuse.
 * This is temporary, will be deleted when issue-174766 is resolved.
 */
export const ALL_PRODUCT_LINES = Object.values(ProductLine);
