/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AppFeatureKey } from '@kbn/security-solution-plugin/common';
import type { SecurityProductLineId } from '../config';

export type PliAppFeatures = Record<SecurityProductLineId, Readonly<AppFeatureKey[]>>;

const securityEssentials: AppFeatureKey[] = [];
const securityComplete: AppFeatureKey[] = [
  ...securityEssentials,
  AppFeatureKey.advancedInsights,
  AppFeatureKey.casesConnectors,
];

const endpointEssentials: AppFeatureKey[] = [AppFeatureKey.endpointExceptions];
const endpointComplete: AppFeatureKey[] = [
  ...endpointEssentials,
  AppFeatureKey.endpointResponseActions,
];

export const PLI_APP_FEATURES: PliAppFeatures = {
  securityEssentials,
  securityComplete,
  endpointEssentials,
  endpointComplete,
} as const;
