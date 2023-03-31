/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppFeatureKey, AppFeatureKeys } from '@kbn/security-solution-plugin/server';
import { ServerlessSecuritySku } from '../config';
import { SKU_APP_FEATURES } from './sku_config';

/**
 * Merges all enabled skus features into a single object, using the last enabled value for each feature.
 */
export const getProjectSkusFeatures = (projectSkus: ServerlessSecuritySku[]): AppFeatureKeys =>
  projectSkus.reduce<AppFeatureKeys>((skusFeatures, projectSku) => {
    const skuFeatures = SKU_APP_FEATURES[projectSku];

    Object.entries(skuFeatures).forEach(([featureName, enabled]) => {
      if (enabled) {
        skusFeatures[featureName as AppFeatureKey] = true;
      }
    });

    return skuFeatures;
  }, {} as AppFeatureKeys);
