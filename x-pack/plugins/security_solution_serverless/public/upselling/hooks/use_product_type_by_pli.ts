/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProductFeatureKeyType } from '@kbn/security-solution-features';
import { useMemo } from 'react';
import { PLI_PRODUCT_FEATURES } from '../../../common/pli/pli_config';

export const getProductTypeByPLI = (requiredPLI: ProductFeatureKeyType): string | null => {
  if (PLI_PRODUCT_FEATURES.security.essentials.includes(requiredPLI)) {
    return 'Security Essentials';
  }
  if (PLI_PRODUCT_FEATURES.security.complete.includes(requiredPLI)) {
    return 'Security Complete';
  }
  if (PLI_PRODUCT_FEATURES.endpoint.essentials.includes(requiredPLI)) {
    return 'Endpoint Essentials';
  }
  if (PLI_PRODUCT_FEATURES.endpoint.complete.includes(requiredPLI)) {
    return 'Endpoint Complete';
  }
  if (PLI_PRODUCT_FEATURES.cloud.essentials.includes(requiredPLI)) {
    return 'Cloud Essentials';
  }
  if (PLI_PRODUCT_FEATURES.cloud.complete.includes(requiredPLI)) {
    return 'Cloud Complete';
  }
  return null;
};

export const useProductTypeByPLI = (requiredPLI: ProductFeatureKeyType): string => {
  return useMemo(() => getProductTypeByPLI(requiredPLI) ?? '', [requiredPLI]);
};
