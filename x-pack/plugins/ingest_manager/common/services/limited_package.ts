/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { PackageInfo, AgentConfig, PackageConfig } from '../types';

// Assume packages only ever include 1 config template for now
export const isPackageLimited = (packageInfo: PackageInfo): boolean => {
  return packageInfo.config_templates?.[0]?.multiple === false;
};

export const doesAgentConfigAlreadyIncludePackage = (
  agentConfig: AgentConfig,
  packageName: string
): boolean => {
  if (agentConfig.package_configs.length && typeof agentConfig.package_configs[0] === 'string') {
    throw new Error('Unable to read full package config information');
  }
  return (agentConfig.package_configs as PackageConfig[])
    .map((packageConfig) => packageConfig.package?.name || '')
    .includes(packageName);
};
