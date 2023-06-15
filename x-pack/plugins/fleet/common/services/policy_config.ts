/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

function isAgentTamperingPolicyValidForLicense(policy: PolicyConfig, license: ILicense | null) {
  if (isAtLeast(license, 'platinum')) {
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
  policy: PolicyConfig,
  license: ILicense | null
): boolean => {
  return isAgentTamperingPolicyValidForLicense(policy, license);
};
