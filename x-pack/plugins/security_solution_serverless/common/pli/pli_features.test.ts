/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getProductProductFeatures } from './pli_features';
import * as pliConfig from './pli_config';
import { ProductLine, ProductTier } from '../product';

describe('getProductProductFeatures', () => {
  it('should return the essentials PLIs features', () => {
    // @ts-ignore reassigning readonly value for testing
    pliConfig.PLI_PRODUCT_FEATURES = {
      security: {
        essentials: ['foo'],
        complete: ['baz'],
      },
    };

    const productFeatureKeys = getProductProductFeatures([
      { product_line: ProductLine.security, product_tier: ProductTier.essentials },
    ]);

    expect(productFeatureKeys).toEqual(['foo']);
  });

  it('should return the complete PLIs features, which includes essentials', () => {
    // @ts-ignore reassigning readonly value for testing
    pliConfig.PLI_PRODUCT_FEATURES = {
      security: {
        essentials: ['foo'],
        complete: ['baz'],
      },
    };

    const productFeatureKeys = getProductProductFeatures([
      { product_line: ProductLine.security, product_tier: ProductTier.complete },
    ]);

    expect(productFeatureKeys).toEqual(['foo', 'baz']);
  });

  it('returns an empty object if no PLIs are enabled', () => {
    expect(getProductProductFeatures([])).toEqual([]);
  });
});
