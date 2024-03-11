/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export * from './routes';
export * as AgentStatusKueryHelper from './agent_status';
export * from './package_helpers';
export {
  packageToPackagePolicyInputs,
  packageToPackagePolicy,
  getStreamsForInputType,
  getRegistryStreamWithDataStreamForInputType,
} from './package_to_package_policy';
export { fullAgentPolicyToYaml } from './full_agent_policy_to_yaml';
export { isPackageLimited, doesAgentPolicyAlreadyIncludePackage } from './limited_package';
export { isValidNamespace, INVALID_NAMESPACE_CHARACTERS } from './is_valid_namespace';
export { isDiffPathProtocol } from './is_diff_path_protocol';
export { LicenseService } from './license';
export * from './is_agent_upgradeable';
export {
  isAgentRequestDiagnosticsSupported,
  MINIMUM_DIAGNOSTICS_AGENT_VERSION,
} from './is_agent_request_diagnostics_supported';
export {
  isInputOnlyPolicyTemplate,
  isIntegrationPolicyTemplate,
  getNormalizedInputs,
  getNormalizedDataStreams,
} from './policy_template';
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
export { getMinVersion, getMaxVersion } from './get_min_max_version';
export {
  getPipelineNameForDatastream,
  getCustomPipelineNameForDatastream,
  getRegistryDataStreamAssetBaseName,
  getComponentTemplateNameForDatastream,
} from './datastream_es_name';

export * from './file_storage';
export {
  getPackageReleaseLabel,
  isPackagePrerelease,
  mapPackageReleaseToIntegrationCardRelease,
} from './package_prerelease';

export { getAllowedOutputTypeForPolicy } from './output_helpers';
export { agentStatusesToSummary } from './agent_statuses_to_summary';

export {
  policyHasFleetServer,
  policyHasAPMIntegration,
  policyHasEndpointSecurity,
  policyHasSyntheticsIntegration,
} from './agent_policies_helpers';

export {
  generateNewAgentPolicyWithDefaults,
  agentPolicyWithoutPaidFeatures,
} from './generate_new_agent_policy';

export {
  isAgentPolicyValidForLicense,
  unsetAgentPolicyAccordingToLicenseLevel,
} from './agent_policy_config';

export {
  getFleetServerVersionMessage,
  isAgentVersionLessThanFleetServer,
} from './check_fleet_server_versions';
