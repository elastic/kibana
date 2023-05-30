/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppFeatureKey, AppFeatureKeys } from '@kbn/security-solution-plugin/common';
import { SecurityProductLineId } from '../config';
import { PLI_APP_FEATURES } from './pli_config';

/**
 * Returns the U (union) of all enabled PLIs features in a single object.
 */
export const getProductAppFeatures = (productLineIds: SecurityProductLineId[]): AppFeatureKeys =>
  productLineIds.reduce<AppFeatureKeys>((appFeatures, productLineId) => {
    const productAppFeatures = PLI_APP_FEATURES[productLineId];

    Object.entries(productAppFeatures).forEach(([featureName, enabled]) => {
      if (enabled) {
        appFeatures[featureName as AppFeatureKey] = true;
      }
    });

    return appFeatures;
  }, {} as AppFeatureKeys);
