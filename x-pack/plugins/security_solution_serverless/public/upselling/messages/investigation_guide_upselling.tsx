/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppFeatureKey } from '@kbn/security-solution-plugin/common';
import { i18n } from '@kbn/i18n';
import { getProductTypeByPLI } from '../hooks/use_product_type_by_pli';

export const UPGRADE_INVESTIGATION_GUIDE = (productTypeRequired: string) =>
  i18n.translate('xpack.securitySolutionServerless.markdown.insight.upsell', {
    defaultMessage:
      'Upgrade to {productTypeRequired} to make use of insights in investigation guides',
    values: {
      productTypeRequired,
    },
  });

export const investigationGuideUpselling = (requiredPLI: AppFeatureKey): string => {
  const productTypeRequired = getProductTypeByPLI(requiredPLI);
  return productTypeRequired ? UPGRADE_INVESTIGATION_GUIDE(productTypeRequired) : '';
};
