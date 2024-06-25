/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProductFeatureKeys } from '@kbn/security-solution-features';
import { ProductFeatureKey } from '@kbn/security-solution-features/keys';
import type { SecurityProductLine, SecurityProductTier } from '../config';

type PliProductFeatures = Readonly<
  Record<SecurityProductLine, Readonly<Record<SecurityProductTier, Readonly<ProductFeatureKeys>>>>
>;

export const PLI_PRODUCT_FEATURES: PliProductFeatures = {
  security: {
    essentials: [
      ProductFeatureKey.endpointHostManagement,
      ProductFeatureKey.endpointPolicyManagement,
    ],
    complete: [
      ProductFeatureKey.advancedInsights,
      ProductFeatureKey.assistant,
      ProductFeatureKey.investigationGuide,
      ProductFeatureKey.investigationGuideInteractions,
      ProductFeatureKey.threatIntelligence,
      ProductFeatureKey.casesConnectors,
      ProductFeatureKey.externalRuleActions,
    ],
  },
  endpoint: {
    essentials: [
      ProductFeatureKey.endpointPolicyProtections,
      ProductFeatureKey.endpointArtifactManagement,
      ProductFeatureKey.endpointExceptions,
    ],
    complete: [
      ProductFeatureKey.endpointResponseActions,
      ProductFeatureKey.osqueryAutomatedResponseActions,
      ProductFeatureKey.endpointAgentTamperProtection,
      ProductFeatureKey.endpointExceptions,
      ProductFeatureKey.endpointProtectionUpdates,
    ],
  },
  cloud: {
    essentials: [ProductFeatureKey.cloudSecurityPosture],
    complete: [],
  },
} as const;
