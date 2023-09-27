/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppFeatureKeys } from '@kbn/security-solution-features';
import type { AppFeaturesConfigurator } from '@kbn/security-solution-plugin/server/lib/app_features_service/types';
import { getCasesAppFeaturesConfigurator } from './cases_app_features_config';
import { getSecurityAppFeaturesConfigurator } from './security_app_features_config';
import { getSecurityAssistantAppFeaturesConfigurator } from './security_assistant_app_features_config';

export const getProductAppFeaturesConfigurator = (
  enabledAppFeatureKeys: AppFeatureKeys
): AppFeaturesConfigurator => {
  return {
    security: getSecurityAppFeaturesConfigurator(enabledAppFeatureKeys),
    cases: getCasesAppFeaturesConfigurator(enabledAppFeatureKeys),
    securityAssistant: getSecurityAssistantAppFeaturesConfigurator(enabledAppFeatureKeys),
  };
};
