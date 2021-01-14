/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ILicense } from '../../../licensing/common/types';
import { isAtLeast } from './license';
import { PolicyConfig, ProtectionModes } from '../endpoint/types';
import { DefaultMalwareMessage, factory } from '../endpoint/models/policy_config';

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

  const defaults = factory();

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
  if (policy.windows.ransomware.mode || policy.mac.ransomware.mode !== ProtectionModes.off) {
    return false;
  }

  // only platinum or higher may enable ransomware notification
  if (policy.windows.popup.ransomware.enabled || policy.mac.popup.ransomware.enabled !== false) {
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
  const defaults = factory();
  if (isAtLeast(license, 'platinum')) {
    return policy;
  }

  // set any license-gated features back to the defaults
  policy.windows.popup.malware.enabled = defaults.windows.popup.malware.enabled;
  policy.mac.popup.malware.enabled = defaults.mac.popup.malware.enabled;
  policy.windows.popup.malware.message = defaults.windows.popup.malware.message;
  policy.mac.popup.malware.message = defaults.mac.popup.malware.message;

  // Ransomware options default off for gold and below licenses
  policy.windows.ransomware.mode = ProtectionModes.off;
  policy.mac.ransomware.mode = ProtectionModes.off;
  policy.windows.popup.ransomware.enabled = false;
  policy.mac.popup.ransomware.enabled = false;
  policy.windows.popup.ransomware.message = defaults.windows.popup.ransomware.message;
  policy.mac.popup.ransomware.message = defaults.mac.popup.ransomware.message;

  return policy;
};
