/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { PackageInfo, AgentPolicy, PackagePolicy } from '../types';

// Assume packages only ever include 1 config template for now
export const isPackageLimited = (packageInfo: PackageInfo): boolean => {
  return packageInfo.config_templates?.[0]?.multiple === false;
};

export const doesAgentPolicyAlreadyIncludePackage = (
  agentPolicy: AgentPolicy,
  packageName: string
): boolean => {
  if (agentPolicy.package_policies.length && typeof agentPolicy.package_policies[0] === 'string') {
    throw new Error('Unable to read full package policy information');
  }
  return (agentPolicy.package_policies as PackagePolicy[])
    .map((packagePolicy) => packagePolicy.package?.name || '')
    .includes(packageName);
};
