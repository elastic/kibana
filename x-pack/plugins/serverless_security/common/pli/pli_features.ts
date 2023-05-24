/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppFeatureKey, AppFeatureKeys } from '@kbn/security-solution-plugin/common';
import { ServerlessSecurityPLI } from '../config';
import { PLI_APP_FEATURES } from './pli_config';

/**
 * Returns the U (union) of all enabled PLIs features in a single object.
 */
export const getProjectPLIsFeatures = (projectPLIs: ServerlessSecurityPLI[]): AppFeatureKeys =>
  projectPLIs.reduce<AppFeatureKeys>((plisFeatures, projectPLI) => {
    const PLIFeatures = PLI_APP_FEATURES[projectPLI];

    Object.entries(PLIFeatures).forEach(([featureName, enabled]) => {
      if (enabled) {
        plisFeatures[featureName as AppFeatureKey] = true;
      }
    });

    return PLIFeatures;
  }, {} as AppFeatureKeys);
