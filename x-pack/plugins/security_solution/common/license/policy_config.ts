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
  DefaultMalwareMessage,
  policyFactoryWithoutPaidFeatures,
  policyFactoryWithSupportedFeatures,
} from '../endpoint/models/policy_config';

/**
 * Given an endpoint package policy, verifies that all enabled features that
 * require a certain license level have a valid license for them.
 */
export const isEndpointPolicyValidForLicense = (
  policy: PolicyConfig,
  license: ILicense | null
): boolean => {
  if (isAtLeast(license, 'platinum')) {
    const defaults = policyFactoryWithSupportedFeatures();

    // only platinum or higher may enable ransomware
    if (policy.windows.ransomware.supported !== defaults.windows.ransomware.supported) {
      return false;
    }

    return true; // currently, platinum allows all features
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
      (p) => p.popup.malware.message !== '' && p.popup.malware.message !== DefaultMalwareMessage
    )
  ) {
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
    policy.windows.popup.ransomware.message !== DefaultMalwareMessage
  ) {
    return false;
  }

  // only platinum or higher may enable ransomware
  if (policy.windows.ransomware.supported !== defaults.windows.ransomware.supported) {
    return false;
  }

  return true;
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
