/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NewPackagePolicyInput } from '@kbn/fleet-plugin/common';
import { ProductFeatureSecurityKey } from '@kbn/security-solution-features/keys';
import type { ProductFeaturesService } from '../../lib/product_features_service';

export const validatePolicyAgainstProductFeatures = (
  inputs: NewPackagePolicyInput[],
  productFeaturesService: ProductFeaturesService
): void => {
  const input = inputs.find((i) => i.type === 'endpoint');
  if (input?.config?.policy?.value?.global_manifest_version) {
    const globalManifestVersion = input.config.policy.value.global_manifest_version;
    if (
      globalManifestVersion !== 'latest' &&
      !productFeaturesService.isEnabled(ProductFeatureSecurityKey.endpointProtectionUpdates)
    ) {
      const productFeatureError: Error & { statusCode?: number; apiPassThrough?: boolean } =
        new Error(
          'To modify protection updates, you must add at least Endpoint Complete to your project.'
        );
      productFeatureError.statusCode = 403;
      productFeatureError.apiPassThrough = true;
      throw productFeatureError;
    }
  }
};
