/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ProductLine, ProductTier } from '../../configs';

export const useProductTypes = jest.fn(() => [
  { product_line: ProductLine.security, product_tier: ProductTier.complete },
]);
