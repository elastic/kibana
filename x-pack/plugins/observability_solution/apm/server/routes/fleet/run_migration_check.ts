/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PackagePolicy } from '@kbn/fleet-plugin/common';
import { APMRouteHandlerResources } from '../apm_routes/register_apm_server_routes';
import { getApmPackagePolicies } from './get_apm_package_policies';
import { getApmPackagePolicy, getCloudAgentPolicy } from './get_cloud_apm_package_policy';
import { getLatestApmPackage } from './get_latest_apm_package';
import { isSuperuser } from './is_superuser';

export interface RunMigrationCheckResponse {
  has_cloud_agent_policy: boolean;
  has_cloud_apm_package_policy: boolean;
  cloud_apm_migration_enabled: boolean;
  has_required_role: boolean | undefined;
  cloud_apm_package_policy: PackagePolicy | undefined;
  has_apm_integrations: boolean;
  latest_apm_package_version: string;
}

export async function runMigrationCheck({
  config,
  plugins,
  context,
  core,
  request,
}: Pick<APMRouteHandlerResources, 'plugins' | 'context' | 'core' | 'request' | 'config'> & {
  plugins: Pick<Required<APMRouteHandlerResources['plugins']>, 'fleet' | 'security'>;
}): Promise<RunMigrationCheckResponse> {
  const cloudApmMigrationEnabled = config.agent.migrations.enabled;

  const savedObjectsClient = (await context.core).savedObjects.client;
  const [fleetPluginStart, securityPluginStart] = await Promise.all([
    plugins.fleet.start(),
    plugins.security.start(),
  ]);

  const hasRequiredRole = isSuperuser({ securityPluginStart, request });
  if (!hasRequiredRole) {
    return {
      has_cloud_agent_policy: false,
      has_cloud_apm_package_policy: false,
      cloud_apm_migration_enabled: cloudApmMigrationEnabled,
      has_required_role: false,
      cloud_apm_package_policy: undefined,
      has_apm_integrations: false,
      latest_apm_package_version: '',
    };
  }
  const cloudAgentPolicy = hasRequiredRole
    ? await getCloudAgentPolicy({
        savedObjectsClient,
        fleetPluginStart,
      })
    : undefined;
  const apmPackagePolicy = getApmPackagePolicy(cloudAgentPolicy);
  const coreStart = await core.start();
  const latestApmPackage = await getLatestApmPackage({
    fleetPluginStart,
    request,
  });

  const packagePolicies = await getApmPackagePolicies({
    coreStart,
    fleetPluginStart,
  });
  return {
    has_cloud_agent_policy: !!cloudAgentPolicy,
    has_cloud_apm_package_policy: !!apmPackagePolicy,
    cloud_apm_migration_enabled: cloudApmMigrationEnabled,
    has_required_role: hasRequiredRole,
    cloud_apm_package_policy: apmPackagePolicy,
    has_apm_integrations: packagePolicies.total > 0,
    latest_apm_package_version: latestApmPackage.package.version,
  };
}
