/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const PACKAGES_SAVED_OBJECT_TYPE = 'epm-packages';
export const ASSETS_SAVED_OBJECT_TYPE = 'epm-packages-assets';
export const MAX_TIME_COMPLETE_INSTALL = 60000;

export const FLEET_SYSTEM_PACKAGE = 'system';
export const FLEET_ELASTIC_AGENT_PACKAGE = 'elastic_agent';
export const FLEET_SERVER_PACKAGE = 'fleet_server';
export const FLEET_ENDPOINT_PACKAGE = 'endpoint';
export const FLEET_APM_PACKAGE = 'apm';
export const FLEET_SYNTHETICS_PACKAGE = 'synthetics';
export const FLEET_KUBERNETES_PACKAGE = 'kubernetes';

export const FLEET_ELASTIC_AGENT_DETAILS_DASHBOARD_ID =
  'elastic_agent-f47f18cc-9c7d-4278-b2ea-a6dee816d395';
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
];

export const autoUpgradePoliciesPackages = [FLEET_APM_PACKAGE, FLEET_SYNTHETICS_PACKAGE];

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
  InstalledBundled: 'installed_bundled',
} as const;
