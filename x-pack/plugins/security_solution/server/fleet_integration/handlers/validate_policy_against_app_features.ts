/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NewPackagePolicyInput } from '@kbn/fleet-plugin/common';
import { AppFeatureSecurityKey } from '@kbn/security-solution-features/src/app_features_keys';
import type { AppFeaturesService } from '../../lib/app_features_service';

export const validatePolicyAgainstAppFeatures = (
  inputs: NewPackagePolicyInput[],
  appFeaturesService: AppFeaturesService
): void => {
  const input = inputs.find((i) => i.type === 'endpoint');
  if (input?.config?.policy?.value?.global_manifest_version) {
    const globalManifestVersion = input.config.policy.value.global_manifest_version;
    if (
      globalManifestVersion !== 'latest' &&
      !appFeaturesService.isEnabled(AppFeatureSecurityKey.endpointProtectionUpdates)
    ) {
      const appFeatureError: Error & { statusCode?: number; apiPassThrough?: boolean } = new Error(
        'To modify protection updates, you must add at least Endpoint Complete to your project.'
      );
      appFeatureError.statusCode = 403;
      appFeatureError.apiPassThrough = true;
      throw appFeatureError;
    }
  }
};
