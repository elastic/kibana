/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackageInfo } from '../types';

export const isAgentlessIntegration = (packageInfo: PackageInfo | undefined) => {
  if (
    packageInfo?.policy_templates &&
    packageInfo?.policy_templates.length > 0 &&
    !!packageInfo?.policy_templates.find(
      (policyTemplate) => policyTemplate?.deployment_modes?.agentless.enabled === true
    )
  ) {
    return true;
  }
  return false;
};

export const getAgentlessAgentPolicyNameFromPackagePolicyName = (packagePolicyName: string) => {
  return `Agentless policy for ${packagePolicyName}`;
};
