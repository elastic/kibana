/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ILicense } from '../../../licensing/common/types';
import { isAtLeast } from './license';
import { PolicyConfig } from '../endpoint/types';
import {
  DefaultPolicyNotificationMessage,
  policyFactoryWithoutPaidFeatures,
  policyFactoryWithSupportedFeatures,
} from '../endpoint/models/policy_config';

function isEndpointPolicyValidForPlatinumLicense(policy: PolicyConfig): boolean {
  const defaults = policyFactoryWithSupportedFeatures();

  // only platinum or higher may enable ransomware
  if (policy.windows.ransomware.supported !== defaults.windows.ransomware.supported) {
    return false;
  }

  // only platinum or higher may enable ransomware
  if (policy.windows.memory_protection.supported !== defaults.windows.memory_protection.supported) {
    return false;
  }

  return true; // currently, platinum allows all features
}

function isEndpointPolicyValidForMalware(policy: PolicyConfig): boolean {
  const defaults = policyFactoryWithoutPaidFeatures();

  // only platinum or higher may disable malware notification
  if (
    policy.windows.popup.malware.enabled !== defaults.windows.popup.malware.enabled ||
    policy.mac.popup.malware.enabled !== defaults.mac.popup.malware.enabled
  ) {
    return false;
  }

  // Only Platinum or higher may change the malware message (which can be blank or what Endpoint defaults)
  if (
    [policy.windows, policy.mac].some(
      (p) =>
        p.popup.malware.message !== '' &&
        p.popup.malware.message !== DefaultPolicyNotificationMessage
    )
  ) {
    return false;
  }
  return true;
}

function isEndpointPolicyValidForRansomware(policy: PolicyConfig): boolean {
  const defaults = policyFactoryWithoutPaidFeatures();
  // only platinum or higher may enable ransomware
  if (policy.windows.ransomware.mode !== defaults.windows.ransomware.mode) {
    return false;
  }
  // only platinum or higher may enable ransomware
  if (policy.windows.ransomware.mode !== defaults.windows.ransomware.mode) {
    return false;
  }

  // only platinum or higher may enable ransomware notification
  if (policy.windows.popup.ransomware.enabled !== defaults.windows.popup.ransomware.enabled) {
    return false;
  }

  // Only Platinum or higher may change the ransomware message (which can be blank or what Endpoint defaults)
  if (
    policy.windows.popup.ransomware.message !== '' &&
    policy.windows.popup.ransomware.message !== DefaultPolicyNotificationMessage
  ) {
    return false;
  }

  // only platinum or higher may enable ransomware
  if (policy.windows.ransomware.supported !== defaults.windows.ransomware.supported) {
    return false;
  }
  return true;
}

function isEndpointPolicyValidForMemoryProtection(policy: PolicyConfig): boolean {
  const defaults = policyFactoryWithoutPaidFeatures();

  // only platinum or higher may enable memory_protection
  if (policy.windows.memory_protection.mode !== defaults.windows.memory_protection.mode) {
    return false;
  }

  // only platinum or higher may enable memory_protection notification
  if (
    policy.windows.popup.memory_protection.enabled !==
    defaults.windows.popup.memory_protection.enabled
  ) {
    return false;
  }

  // Only Platinum or higher may change the memory_protection message (which can be blank or what Endpoint defaults)
  if (
    policy.windows.popup.memory_protection.message !== '' &&
    policy.windows.popup.memory_protection.message !== DefaultPolicyNotificationMessage
  ) {
    return false;
  }

  // only platinum or higher may enable memory_protection
  if (policy.windows.memory_protection.supported !== defaults.windows.memory_protection.supported) {
    return false;
  }
  return true;
}

function isEndpointPolicyValidForNonPlatinumLicense(policy: PolicyConfig): boolean {
  if (!isEndpointPolicyValidForMalware(policy)) {
    return false;
  }

  if (!isEndpointPolicyValidForRansomware(policy)) {
    return false;
  }

  if (!isEndpointPolicyValidForMemoryProtection(policy)) {
    return false;
  }

  return true;
}

/**
 * Given an endpoint package policy, verifies that all enabled features that
 * require a certain license level have a valid license for them.
 */
export const isEndpointPolicyValidForLicense = (
  policy: PolicyConfig,
  license: ILicense | null
): boolean => {
  if (isAtLeast(license, 'platinum')) {
    return isEndpointPolicyValidForPlatinumLicense(policy);
  }
  return isEndpointPolicyValidForNonPlatinumLicense(policy);
};

/**
 * Resets paid features in a PolicyConfig back to default values
 * when unsupported by the given license level.
 */
export const unsetPolicyFeaturesAccordingToLicenseLevel = (
  policy: PolicyConfig,
  license: ILicense | null
): PolicyConfig => {
  if (isAtLeast(license, 'platinum')) {
    return policyFactoryWithSupportedFeatures(policy);
  }

  // set any license-gated features back to the defaults
  return policyFactoryWithoutPaidFeatures(policy);
};
