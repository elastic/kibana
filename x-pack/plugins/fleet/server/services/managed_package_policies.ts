/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from 'src/core/server';

import { AUTO_UPDATE_PACKAGES } from '../../common';

import { appContextService } from './app_context';
import { getPackageInfo } from './epm/packages';
import { packagePolicyService } from './package_policy';

/**
 * Upgrade any package policies for packages installed through setup that are denoted as `AUTO_UPGRADE` packages
 * or have the `keep_policies_up_to_date` flag set to `true`
 */
export const upgradeManagedPackagePolicies = async (
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  packagePolicyIds: string[]
) => {
  const policyIdsToUpgrade: string[] = [];

  for (const packagePolicyId of packagePolicyIds) {
    const packagePolicy = await packagePolicyService.get(soClient, packagePolicyId);

    if (!packagePolicy || !packagePolicy.package) {
      continue;
    }

    const packageInfo = await getPackageInfo({
      savedObjectsClient: soClient,
      pkgName: packagePolicy.package.name,
      pkgVersion: packagePolicy.package.version,
    });

    const shouldUpgradePolicies =
      AUTO_UPDATE_PACKAGES.some((pkg) => pkg.name === packageInfo.name) ||
      packageInfo.keepPoliciesUpToDate;

    if (shouldUpgradePolicies) {
      policyIdsToUpgrade.push(packagePolicy.id);
    }
  }

  if (policyIdsToUpgrade.length) {
    appContextService
      .getLogger()
      .debug(
        `Upgrading ${policyIdsToUpgrade.length} package policies: ${policyIdsToUpgrade.join(', ')}`
      );

    await packagePolicyService.upgrade(soClient, esClient, policyIdsToUpgrade);
  }
};
