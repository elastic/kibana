/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NewPackagePolicy } from '@kbn/fleet-plugin/common';
import { PolicyConfig, PolicyOperatingSystem, ProtectionModes } from '../../common/endpoint/types';
import { EndpointMetadataService } from '../endpoint/services/metadata';
import { FeatureUsageService } from '../endpoint/services/feature_usage/service';

const OS_KEYS = Object.values(PolicyOperatingSystem);
const PROTECTION_KEYS = ['memory_protection', 'behavior_protection'] as const;

function isNewlyEnabled(current: ProtectionModes, next: ProtectionModes) {
  if (current === 'off' && (next === 'prevent' || next === 'detect')) {
    return true;
  }

  return false;
}

function notifyProtection(type: string, featureUsageService: FeatureUsageService) {
  switch (type) {
    case 'ransomware':
      featureUsageService.notifyUsage('RANSOMWARE_PROTECTION');
      return;
    case 'memory_protection':
      featureUsageService.notifyUsage('MEMORY_THREAT_PROTECTION');
      return;
    case 'behavior_protection':
      featureUsageService.notifyUsage('BEHAVIOR_PROTECTION');
  }
}

export async function notifyProtectionFeatureUsage(
  newPackagePolicy: NewPackagePolicy,
  featureUsageService: FeatureUsageService,
  endpointMetadataService: EndpointMetadataService
) {
  if (
    !newPackagePolicy?.id ||
    !newPackagePolicy?.inputs ||
    !newPackagePolicy.inputs[0]?.config?.policy?.value
  ) {
    return;
  }

  const newPolicyConfig = newPackagePolicy.inputs[0].config?.policy?.value as PolicyConfig;

  // function is only called on policy update, we need to fetch the current policy
  // to compare whether the updated policy is newly enabling protections
  const currentPackagePolicy = await endpointMetadataService.getFleetEndpointPackagePolicy(
    newPackagePolicy.id as string
  );
  const currentPolicyConfig = currentPackagePolicy.inputs[0].config.policy.value;

  // ransomware is windows only
  if (
    isNewlyEnabled(
      currentPolicyConfig.windows.ransomware.mode,
      newPolicyConfig.windows.ransomware.mode
    )
  ) {
    notifyProtection('ransomware', featureUsageService);
  }

  PROTECTION_KEYS.forEach((protectionKey) => {
    // only notify once per protection since protection can't be configured per os
    let notified = false;

    OS_KEYS.forEach((osKey) => {
      if (
        !notified &&
        isNewlyEnabled(
          currentPolicyConfig[osKey][protectionKey].mode,
          newPolicyConfig[osKey][protectionKey].mode
        )
      ) {
        notifyProtection(protectionKey, featureUsageService);
        notified = true;
      }
    });
  });
}
