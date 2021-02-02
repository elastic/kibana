/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ILicense } from '../../../licensing/common/types';
import { isAtLeast } from './license';
import { PolicyConfig } from '../endpoint/types';
import {
  DefaultMalwareMessage,
  policyFactoryWithoutPaidFeatures,
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
  if (
    policy.windows.ransomware.mode !== defaults.windows.ransomware.mode ||
    policy.mac.ransomware.mode !== defaults.mac.ransomware.mode
  ) {
    return false;
  }

  // only platinum or higher may enable ransomware notification
  if (
    policy.windows.popup.ransomware.enabled !== defaults.windows.popup.ransomware.enabled ||
    policy.mac.popup.ransomware.enabled !== defaults.mac.popup.ransomware.enabled
  ) {
    return false;
  }

  // Only Platinum or higher may change the ransomware message (which can be blank or what Endpoint defaults)
  if (
    [policy.windows, policy.mac].some(
      (p) =>
        p.popup.ransomware.message !== '' && p.popup.ransomware.message !== DefaultMalwareMessage
    )
  ) {
    return false;
  }

  return true;
};

/**
 * Resets paid features in a PolicyConfig back to default values
 * when unsupported by the given license level.
 */
export const unsetPolicyFeaturesAboveLicenseLevel = (
  policy: PolicyConfig,
  license: ILicense | null
): PolicyConfig => {
  if (isAtLeast(license, 'platinum')) {
    return policy;
  }

  // set any license-gated features back to the defaults
  return policyFactoryWithoutPaidFeatures(policy);
};
