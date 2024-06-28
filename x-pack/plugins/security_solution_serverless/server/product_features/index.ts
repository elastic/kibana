/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProductFeatureKeys } from '@kbn/security-solution-features';
import type { ProductFeaturesConfigurator } from '@kbn/security-solution-plugin/server/lib/product_features_service/types';
import type { Logger } from '@kbn/logging';
import type { ServerlessSecurityConfig } from '../config';
import { getCasesProductFeaturesConfigurator } from './cases_product_features_config';
import { getSecurityProductFeaturesConfigurator } from './security_product_features_config';
import { getSecurityAssistantProductFeaturesConfigurator } from './assistant_product_features_config';
import type { Tier } from '../types';
import { ProductLine } from '../../common/product';

export const getProductProductFeaturesConfigurator = (
  enabledProductFeatureKeys: ProductFeatureKeys,
  config: ServerlessSecurityConfig
): ProductFeaturesConfigurator => {
  return {
    security: getSecurityProductFeaturesConfigurator(
      enabledProductFeatureKeys,
      config.experimentalFeatures
    ),
    cases: getCasesProductFeaturesConfigurator(enabledProductFeatureKeys),
    securityAssistant: getSecurityAssistantProductFeaturesConfigurator(enabledProductFeatureKeys),
  };
};

export const getSecurityProductTier = (config: ServerlessSecurityConfig, logger: Logger): Tier => {
  const securityProductType = config.productTypes.find(
    (productType) => productType.product_line === ProductLine.security
  );
  const tier = securityProductType ? securityProductType.product_tier : 'none';
  if (tier === 'none') {
    logger.error(`Failed to fetch security product tier, config: ${JSON.stringify(config)}`);
  }

  return tier;
};
