/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppFeaturesConfig } from '@kbn/security-solution-features';
import type {
  SecuritySubFeatureId,
  CasesSubFeatureId,
  AssistantSubFeatureId,
} from '@kbn/security-solution-features/keys';
import type { ExperimentalFeatures } from '../../../common';

export interface AppFeaturesConfigurator {
  security: (experimentalFlags: ExperimentalFeatures) => AppFeaturesConfig<SecuritySubFeatureId>;
  cases: () => AppFeaturesConfig<CasesSubFeatureId>;
  securityAssistant: () => AppFeaturesConfig<AssistantSubFeatureId>;
}
