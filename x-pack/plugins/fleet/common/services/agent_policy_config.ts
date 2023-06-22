/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ILicense } from '@kbn/licensing-plugin/common/types';

import type { AgentPolicy } from '../types';

import { hasAtLeast } from './license';

function isAgentTamperingPolicyValidForLicense(policy: AgentPolicy, license: ILicense | null) {
  if (hasAtLeast(license, 'platinum')) {
    // platinum allows agent tamper protection
    return true;
  }

  const defaults = policyFactoryWithoutPaidFeatures();

  // only platinum or higher may modify agent tampering
  if (policy.agent.protection.enabled !== defaults.policy.agent.protection.enabled) {
    return false;
  }

  return true;
}

export const isAgentPolicyValidForLicense = (
  policy: AgentPolicy,
  license: ILicense | null
): boolean => {
  return isAgentTamperingPolicyValidForLicense(policy, license);
};

/**
 * Resets paid features in a AgentPolicy back to default values
 * when unsupported by the given license level.
 */
export const unsetAgentPolicyAccordingToLicenseLevel = (
  policy: AgentPolicy,
  license: ILicense | null
): AgentPolicy => {
  if (hasAtLeast(license, 'platinum')) {
    return policyFactoryWithSupportedFeatures(policy);
  }

  // set any license-gated features back to the defaults
  return policyFactoryWithoutPaidFeatures(policy);
};
