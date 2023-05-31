/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AppFeatureKey, AppFeatureKeys } from '@kbn/security-solution-plugin/common';
import type { SecurityProductLineId } from '../config';

export const PLI_APP_FEATURES: Record<SecurityProductLineId, AppFeatureKeys> = {
  securityEssentials: {
    [AppFeatureKey.advancedInsights]: false,
    [AppFeatureKey.casesConnectors]: false,
  },

  securityComplete: {
    [AppFeatureKey.advancedInsights]: true,
    [AppFeatureKey.casesConnectors]: true,
  },
} as const;
