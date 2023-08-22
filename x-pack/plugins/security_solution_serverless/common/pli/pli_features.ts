/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppFeatureKeys } from '@kbn/security-solution-plugin/common';
import type { SecurityProductTypes } from '../config';
import { ProductTier } from '../product';
import { PLI_APP_FEATURES } from './pli_config';

/**
 * Returns the U (union) of all PLIs from the enabled productTypes in a single array.
 */
export const getProductAppFeatures = (productTypes: SecurityProductTypes): AppFeatureKeys => {
  const appFeatureKeys = productTypes.reduce<AppFeatureKeys>(
    (appFeatures, { product_line: line, product_tier: tier }) => {
      if (tier === ProductTier.complete) {
        appFeatures.push(...PLI_APP_FEATURES[line][ProductTier.essentials]);
      }
      appFeatures.push(...PLI_APP_FEATURES[line][tier]);
      return appFeatures;
    },
    []
  );
  return appFeatureKeys;
};
