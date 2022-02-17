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
  DefaultPolicyRuleNotificationMessage,
  policyFactoryWithoutPaidFeatures,
  policyFactoryWithSupportedFeatures,
} from '../endpoint/models/policy_config';

function isEndpointMalwarePolicyValidForLicense(policy: PolicyConfig, license: ILicense | null) {
  if (isAtLeast(license, 'platinum')) {
    // platinum allows all malware features
    return true;
  }

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

function isEndpointRansomwarePolicyValidForLicense(policy: PolicyConfig, license: ILicense | null) {
  if (isAtLeast(license, 'platinum')) {
    const defaults = policyFactoryWithSupportedFeatures();

    // only platinum or higher may enable ransomware protection
    if (policy.windows.ransomware.supported !== defaults.windows.ransomware.supported) {
      return false;
    }
    return true;
  }
  // only platinum or higher may enable ransomware
  // only platinum or higher may enable ransomware notification
  // Only Platinum or higher may change the ransomware message
  // (which can be blank or what Endpoint defaults)
  const defaults = policyFactoryWithoutPaidFeatures();

  if (policy.windows.ransomware.supported !== defaults.windows.ransomware.supported) {
    return false;
  }

  if (policy.windows.ransomware.mode !== defaults.windows.ransomware.mode) {
    return false;
  }

  if (policy.windows.popup.ransomware.enabled !== defaults.windows.popup.ransomware.enabled) {
    return false;
  }

  if (
    policy.windows.popup.ransomware.message !== '' &&
    policy.windows.popup.ransomware.message !== DefaultPolicyNotificationMessage
  ) {
    return false;
  }

  return true;
}

function isEndpointMemoryPolicyValidForLicense(policy: PolicyConfig, license: ILicense | null) {
  if (isAtLeast(license, 'platinum')) {
    const defaults = policyFactoryWithSupportedFeatures();
    // only platinum or higher may enable memory protection
    if (
      policy.windows.memory_protection.supported !== defaults.windows.memory_protection.supported ||
      policy.mac.memory_protection.supported !== defaults.mac.memory_protection.supported ||
      policy.linux.memory_protection.supported !== defaults.linux.memory_protection.supported
    ) {
      return false;
    }
    return true;
  }

  // only platinum or higher may enable memory_protection
  // only platinum or higher may enable memory_protection notification
  // Only Platinum or higher may change the memory_protection message
  // (which can be blank or what Endpoint defaults)
  // only platinum or higher may enable memory_protection
  const defaults = policyFactoryWithoutPaidFeatures();

  if (
    policy.windows.memory_protection.mode !== defaults.windows.memory_protection.mode ||
    policy.mac.memory_protection.mode !== defaults.mac.memory_protection.mode ||
    policy.linux.memory_protection.mode !== defaults.linux.memory_protection.mode
  ) {
    return false;
  }

  if (
    policy.windows.popup.memory_protection.enabled !==
      defaults.windows.popup.memory_protection.enabled ||
    policy.mac.popup.memory_protection.enabled !== defaults.mac.popup.memory_protection.enabled ||
    policy.linux.popup.memory_protection.enabled !== defaults.linux.popup.memory_protection.enabled
  ) {
    return false;
  }

  if (
    (policy.windows.popup.memory_protection.message !== '' &&
      policy.windows.popup.memory_protection.message !== DefaultPolicyRuleNotificationMessage) ||
    (policy.mac.popup.memory_protection.message !== '' &&
      policy.mac.popup.memory_protection.message !== DefaultPolicyRuleNotificationMessage) ||
    (policy.linux.popup.memory_protection.message !== '' &&
      policy.linux.popup.memory_protection.message !== DefaultPolicyRuleNotificationMessage)
  ) {
    return false;
  }

  if (
    policy.windows.memory_protection.supported !== defaults.windows.memory_protection.supported ||
    policy.mac.memory_protection.supported !== defaults.mac.memory_protection.supported ||
    policy.linux.memory_protection.supported !== defaults.linux.memory_protection.supported
  ) {
    return false;
  }
  return true;
}
function isEndpointBehaviorPolicyValidForLicense(policy: PolicyConfig, license: ILicense | null) {
  if (isAtLeast(license, 'platinum')) {
    const defaults = policyFactoryWithSupportedFeatures();
    // only platinum or higher may enable behavior protection
    if (
      policy.windows.behavior_protection.supported !==
        defaults.windows.behavior_protection.supported ||
      policy.mac.behavior_protection.supported !== defaults.mac.behavior_protection.supported ||
      policy.linux.behavior_protection.supported !== defaults.linux.behavior_protection.supported
    ) {
      return false;
    }

    return true;
  }
  const defaults = policyFactoryWithoutPaidFeatures();

  // only platinum or higher may enable behavior_protection
  if (
    policy.windows.behavior_protection.mode !== defaults.windows.behavior_protection.mode ||
    policy.mac.behavior_protection.mode !== defaults.mac.behavior_protection.mode ||
    policy.linux.behavior_protection.mode !== defaults.linux.behavior_protection.mode
  ) {
    return false;
  }

  // only platinum or higher may enable behavior_protection notification
  if (
    policy.windows.popup.behavior_protection.enabled !==
      defaults.windows.popup.behavior_protection.enabled ||
    policy.mac.popup.behavior_protection.enabled !==
      defaults.mac.popup.behavior_protection.enabled ||
    policy.linux.popup.behavior_protection.enabled !==
      defaults.linux.popup.behavior_protection.enabled
  ) {
    return false;
  }

  // Only Platinum or higher may change the behavior_protection message (which can be blank or what Endpoint defaults)
  if (
    (policy.windows.popup.behavior_protection.message !== '' &&
      policy.windows.popup.behavior_protection.message !== DefaultPolicyRuleNotificationMessage) ||
    (policy.mac.popup.behavior_protection.message !== '' &&
      policy.mac.popup.behavior_protection.message !== DefaultPolicyRuleNotificationMessage) ||
    (policy.linux.popup.behavior_protection.message !== '' &&
      policy.linux.popup.behavior_protection.message !== DefaultPolicyRuleNotificationMessage)
  ) {
    return false;
  }

  // only platinum or higher may enable behavior_protection
  if (
    policy.windows.behavior_protection.supported !==
      defaults.windows.behavior_protection.supported ||
    policy.mac.behavior_protection.supported !== defaults.mac.behavior_protection.supported ||
    policy.linux.behavior_protection.supported !== defaults.linux.behavior_protection.supported
  ) {
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
  return (
    isEndpointMalwarePolicyValidForLicense(policy, license) &&
    isEndpointRansomwarePolicyValidForLicense(policy, license) &&
    isEndpointMemoryPolicyValidForLicense(policy, license) &&
    isEndpointBehaviorPolicyValidForLicense(policy, license)
  );
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
