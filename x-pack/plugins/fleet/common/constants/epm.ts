/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DisplayedAssetTypes } from '../types/models';
import { ElasticsearchAssetType, KibanaSavedObjectType } from '../types/models';

export const PACKAGES_SAVED_OBJECT_TYPE = 'epm-packages';
export const ASSETS_SAVED_OBJECT_TYPE = 'epm-packages-assets';
export const MAX_TIME_COMPLETE_INSTALL = 30 * 60 * 1000; // 30 minutes

export const FLEET_SYSTEM_PACKAGE = 'system';
export const FLEET_ELASTIC_AGENT_PACKAGE = 'elastic_agent';
export const FLEET_SERVER_PACKAGE = 'fleet_server';
export const FLEET_ENDPOINT_PACKAGE = 'endpoint';
export const FLEET_APM_PACKAGE = 'apm';
export const FLEET_SYNTHETICS_PACKAGE = 'synthetics';
export const FLEET_KUBERNETES_PACKAGE = 'kubernetes';
export const FLEET_UNIVERSAL_PROFILING_SYMBOLIZER_PACKAGE = 'profiler_symbolizer';
export const FLEET_UNIVERSAL_PROFILING_COLLECTOR_PACKAGE = 'profiler_collector';
export const FLEET_CLOUD_SECURITY_POSTURE_PACKAGE = 'cloud_security_posture';
export const FLEET_CLOUD_SECURITY_POSTURE_KSPM_POLICY_TEMPLATE = 'kspm';
export const FLEET_CLOUD_SECURITY_POSTURE_CSPM_POLICY_TEMPLATE = 'cspm';
export const FLEET_CLOUD_SECURITY_POSTURE_CNVM_POLICY_TEMPLATE = 'vuln_mgmt';
export const FLEET_CLOUD_DEFEND_PACKAGE = 'cloud_defend';
export const FLEET_PF_HOST_AGENT_PACKAGE = 'pf-host-agent';
export const FLEET_PF_ELASTIC_SYMBOLIZER_PACKAGE = 'pf-elastic-symbolizer';
export const FLEET_PF_ELASTIC_COLLECTOR_PACKAGE = 'pf-elastic-collector';
export const FLEET_CLOUD_BEAT_PACKAGE = 'cloudbeat';
export const FLEET_CLOUD_BEAT_CIS_K8S_PACKAGE = `${FLEET_CLOUD_BEAT_PACKAGE}/cis_k8s`;
export const FLEET_CLOUD_BEAT_CIS_EKS_PACKAGE = `${FLEET_CLOUD_BEAT_PACKAGE}/cis_eks`;
export const FLEET_CLOUD_BEAT_CIS_AWS_PACKAGE = `${FLEET_CLOUD_BEAT_PACKAGE}/cis_aws`;
export const FLEET_CLOUD_BEAT_CIS_GCP_PACKAGE = `${FLEET_CLOUD_BEAT_PACKAGE}/cis_gcp`;
export const FLEET_CLOUD_BEAT_CIS_AZURE_PACKAGE = `${FLEET_CLOUD_BEAT_PACKAGE}/cis_azure`;
export const FLEET_CLOUD_BEAT_VULN_MGMT_AWS_PACKAGE = `${FLEET_CLOUD_BEAT_PACKAGE}/vuln_mgmt_aws`;

export const GLOBAL_DATA_TAG_EXCLUDED_INPUTS = new Set<string>([
  FLEET_APM_PACKAGE,
  FLEET_PF_HOST_AGENT_PACKAGE,
  FLEET_PF_ELASTIC_SYMBOLIZER_PACKAGE,
  FLEET_PF_ELASTIC_COLLECTOR_PACKAGE,
  /* The package names and input types are not the same. For example package
   * name for fleet server is "fleet_server" whereas the input type is "fleet-server".
   * This is the same case for cloud defend. That's why we are replacing the
   * underscores with dashes for the two of them. Global data tag functionality
   * relies on input types.
   */
  FLEET_SERVER_PACKAGE.replace(/_/g, '-'),
  FLEET_CLOUD_DEFEND_PACKAGE.replace(/_/g, '-'),
  FLEET_CLOUD_BEAT_PACKAGE,
  FLEET_CLOUD_BEAT_CIS_K8S_PACKAGE,
  FLEET_CLOUD_BEAT_CIS_EKS_PACKAGE,
  FLEET_CLOUD_BEAT_CIS_AWS_PACKAGE,
  FLEET_CLOUD_BEAT_CIS_GCP_PACKAGE,
  FLEET_CLOUD_BEAT_CIS_AZURE_PACKAGE,
  FLEET_CLOUD_BEAT_VULN_MGMT_AWS_PACKAGE,
]);

export const PACKAGE_TEMPLATE_SUFFIX = '@package';
export const USER_SETTINGS_TEMPLATE_SUFFIX = '@custom';

export const DATASET_VAR_NAME = 'data_stream.dataset';

export const CUSTOM_INTEGRATION_PACKAGE_SPEC_VERSION = '2.9.0';

export const GENERIC_DATASET_NAME = 'generic';

/*
 Package rules:
|               | autoUpdatePackages |
|---------------|:------------------:|
| Auto-updates  |          ✔️         |


We also define "auto upgrade policies" packages below. These are packages that are considered "stack-aligned"
and require policies to be auto-upgraded in order to properly function. Commonly, packages that ship custom policy
editor UI's in the Kibana codebase will be included in this set of packages to avoid backwards-compatibility concerns
in their custom policy editor implementations.

*/

export const autoUpdatePackages = [
  FLEET_ENDPOINT_PACKAGE,
  FLEET_APM_PACKAGE,
  FLEET_SYNTHETICS_PACKAGE,
  FLEET_CLOUD_SECURITY_POSTURE_PACKAGE,
];

export const HIDDEN_API_REFERENCE_PACKAGES = [
  FLEET_ENDPOINT_PACKAGE,
  FLEET_APM_PACKAGE,
  FLEET_SYNTHETICS_PACKAGE,
];

export const autoUpgradePoliciesPackages = [
  FLEET_APM_PACKAGE,
  FLEET_SYNTHETICS_PACKAGE,
  FLEET_CLOUD_SECURITY_POSTURE_PACKAGE,
];

export const agentAssetTypes = {
  Input: 'input',
} as const;

export const dataTypes = {
  Logs: 'logs',
  Metrics: 'metrics',
} as const;

// currently identical but may be a subset or otherwise different some day
export const monitoringTypes = Object.values(dataTypes);

export const installationStatuses = {
  Installed: 'installed',
  Installing: 'installing',
  InstallFailed: 'install_failed',
  NotInstalled: 'not_installed',
} as const;

// These asset types are allowed to be shown on Integration details > Assets tab
// This array also controls the order in which the asset types are displayed
export const displayedAssetTypes: DisplayedAssetTypes = [
  ...Object.values(KibanaSavedObjectType),
  ...Object.values(ElasticsearchAssetType),
];

export const displayedAssetTypesLookup = new Set<string>(displayedAssetTypes);
