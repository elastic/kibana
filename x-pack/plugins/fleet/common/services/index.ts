/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export * from './routes';
export * as AgentStatusKueryHelper from './agent_status';
export {
  packageToPackagePolicyInputs,
  packageToPackagePolicy,
  getStreamsForInputType,
} from './package_to_package_policy';
export { fullAgentPolicyToYaml } from './full_agent_policy_to_yaml';
export { isPackageLimited, doesAgentPolicyAlreadyIncludePackage } from './limited_package';
export { decodeCloudId } from './decode_cloud_id';
export { isValidNamespace } from './is_valid_namespace';
export { isDiffPathProtocol } from './is_diff_path_protocol';
export { LicenseService } from './license';
export { isAgentUpgradeable } from './is_agent_upgradeable';
export { doesPackageHaveIntegrations } from './packages_with_integrations';
export type {
  PackagePolicyValidationResults,
  PackagePolicyConfigValidationResults,
  PackagePolicyInputValidationResults,
} from './validate_package_policy';
export {
  validatePackagePolicy,
  validatePackagePolicyConfig,
  validationHasErrors,
  countValidationErrors,
} from './validate_package_policy';

export { normalizeHostsForAgents } from './hosts_utils';
export { splitPkgKey } from './split_pkg_key';
export { getMaxPackageName } from './max_package_name';
