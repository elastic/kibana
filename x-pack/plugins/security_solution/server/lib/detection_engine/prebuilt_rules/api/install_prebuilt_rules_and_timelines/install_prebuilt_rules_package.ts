/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecuritySolutionApiRequestHandlerContext } from '../../../../../types';
import { PREBUILT_RULES_PACKAGE_NAME } from '../../../../../../common/detection_engine/constants';
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
  // Get package version from the config
  let pkgVersion = config.prebuiltRulesPackageVersion;

  // Find latest package if the version isn't specified in the config
  if (!pkgVersion) {
    // Use prerelease versions in dev environment
    const isPrerelease =
      context.getAppClient().getKibanaVersion().includes('-SNAPSHOT') ||
      context.getAppClient().getKibanaBranch() === 'main';

    const result = await context
      .getInternalFleetServices()
      .packages.fetchFindLatestPackage(PREBUILT_RULES_PACKAGE_NAME, { prerelease: isPrerelease });
    pkgVersion = result.version;
  }

  // Install the package
  await context
    .getInternalFleetServices()
    .packages.ensureInstalledPackage({ pkgName: PREBUILT_RULES_PACKAGE_NAME, pkgVersion });
}
