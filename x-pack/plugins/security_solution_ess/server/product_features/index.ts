/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProductFeatureKeys } from '@kbn/security-solution-features';
import type { ProductFeaturesConfigurator } from '@kbn/security-solution-plugin/server/lib/product_features_service/types';
import { getCasesProductFeaturesConfigurator } from './cases_product_features_config';
import { getSecurityProductFeaturesConfigurator } from './security_product_features_config';
import { getSecurityAssistantProductFeaturesConfigurator } from './assistant_product_features_config';
import { getRuleManagementProductFeaturesConfigurator } from './rule_management_product_features_config';

export const getProductProductFeaturesConfigurator = (
  enabledProductFeatureKeys: ProductFeatureKeys
): ProductFeaturesConfigurator => {
  return {
    security: getSecurityProductFeaturesConfigurator(enabledProductFeatureKeys),
    cases: getCasesProductFeaturesConfigurator(enabledProductFeatureKeys),
    securityAssistant: getSecurityAssistantProductFeaturesConfigurator(enabledProductFeatureKeys),
    ruleManagement: getRuleManagementProductFeaturesConfigurator(enabledProductFeatureKeys),
  };
};
