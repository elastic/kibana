/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AppFeatureKey, type AppFeatureKeys } from '@kbn/security-solution-plugin/common';
import type { SecurityProductLine, SecurityProductTier } from '../config';

type PliAppFeatures = Readonly<
  Record<SecurityProductLine, Readonly<Record<SecurityProductTier, Readonly<AppFeatureKeys>>>>
>;

export const PLI_APP_FEATURES: PliAppFeatures = {
  security: {
    essentials: [AppFeatureKey.endpointHostManagement, AppFeatureKey.endpointPolicyManagement],
    complete: [
      AppFeatureKey.advancedInsights,
      AppFeatureKey.assistant,
      AppFeatureKey.investigationGuide,
      AppFeatureKey.threatIntelligence,
      AppFeatureKey.casesConnectors,
    ],
  },
  endpoint: {
    essentials: [AppFeatureKey.endpointPolicyProtections, AppFeatureKey.endpointArtifactManagement],
    complete: [
      AppFeatureKey.endpointResponseActions,
      AppFeatureKey.osqueryAutomatedResponseActions,
    ],
  },
  cloud: {
    essentials: [],
    complete: [],
  },
} as const;
