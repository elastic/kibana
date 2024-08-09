/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecuritySolutionApiRequestHandlerContext } from '../../../../../types';
import {
  ENDPOINT_PACKAGE_NAME,
  PREBUILT_RULES_PACKAGE_NAME,
} from '../../../../../../common/detection_engine/constants';
import type { ConfigType } from '../../../../../config';

/**
 * Installs the prebuilt rules package of the config's specified or latest version.
 *
 * @param config Kibana config
 * @param context Request handler context
 */
export async function installPrebuiltRulesPackage(
  config: ConfigType,
  context: SecuritySolutionApiRequestHandlerContext
) {
  const pkgVersion = await findLatestPackageVersion(config, context, PREBUILT_RULES_PACKAGE_NAME);

  return context
    .getInternalFleetServices()
    .packages.ensureInstalledPackage({ pkgName: PREBUILT_RULES_PACKAGE_NAME, pkgVersion });
}

export async function installEndpointPackage(
  config: ConfigType,
  context: SecuritySolutionApiRequestHandlerContext
) {
  const pkgVersion = await findLatestPackageVersion(config, context, ENDPOINT_PACKAGE_NAME);

  return context.getInternalFleetServices().packages.ensureInstalledPackage({
    pkgName: ENDPOINT_PACKAGE_NAME,
    pkgVersion,
  });
}

async function findLatestPackageVersion(
  config: ConfigType,
  context: SecuritySolutionApiRequestHandlerContext,
  packageName: string
) {
  let pkgVersion = config.prebuiltRulesPackageVersion;

  // Find latest package if the version isn't specified in the config
  if (!pkgVersion) {
    const securityAppClient = context.getAppClient();
    // Use prerelease versions in dev environment
    const isPrerelease =
      securityAppClient.getBuildFlavor() === 'traditional' &&
      (securityAppClient.getKibanaVersion().includes('-SNAPSHOT') ||
        securityAppClient.getKibanaBranch() === 'main');

    const result = await context
      .getInternalFleetServices()
      .packages.fetchFindLatestPackage(packageName, { prerelease: isPrerelease });
    pkgVersion = result.version;
  }
  return pkgVersion;
}
