/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackageInfo, RegistryPolicyTemplate } from '../types';

export const isAgentlessIntegration = (
  packageInfo: Pick<PackageInfo, 'policy_templates'> | undefined
) => {
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

export const isOnlyAgentlessIntegration = (
  packageInfo: Pick<PackageInfo, 'policy_templates'> | undefined
) => {
  if (
    packageInfo?.policy_templates &&
    packageInfo?.policy_templates.length > 0 &&
    packageInfo?.policy_templates.every((policyTemplate) =>
      isOnlyAgentlessPolicyTemplate(policyTemplate)
    )
  ) {
    return true;
  }
  return false;
};

export const isOnlyAgentlessPolicyTemplate = (policyTemplate: RegistryPolicyTemplate) => {
  return Boolean(
    policyTemplate.deployment_modes &&
      policyTemplate.deployment_modes.agentless.enabled === true &&
      (!policyTemplate.deployment_modes.default ||
        policyTemplate.deployment_modes.default.enabled === false)
  );
};
