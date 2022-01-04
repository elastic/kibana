/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, ISavedObjectsRepository } from 'src/core/server';
import semverGte from 'semver/functions/gte';

import type {
  Installation,
  PackageInfo,
  UpgradePackagePolicyDryRunResponseItem,
} from '../../common';

import { appContextService } from './app_context';
import { getInstallation, getPackageInfo } from './epm/packages';
import { packagePolicyService } from './package_policy';

export interface UpgradeManagedPackagePoliciesResult {
  packagePolicyId: string;
  diff?: UpgradePackagePolicyDryRunResponseItem['diff'];
  errors: any;
}

/**
 * Upgrade any package policies for packages installed through setup that are denoted as `AUTO_UPGRADE` packages
 * or have the `keep_policies_up_to_date` flag set to `true`
 */
export const upgradeManagedPackagePolicies = async (
  soRepo: ISavedObjectsRepository,
  esClient: ElasticsearchClient,
  packagePolicyIds: string[]
): Promise<UpgradeManagedPackagePoliciesResult[]> => {
  const results: UpgradeManagedPackagePoliciesResult[] = [];

  for (const packagePolicyId of packagePolicyIds) {
    const packagePolicy = await packagePolicyService.get(soRepo, packagePolicyId);

    if (!packagePolicy || !packagePolicy.package) {
      continue;
    }

    const packageInfo = await getPackageInfo({
      savedObjectsRepo: soRepo,
      pkgName: packagePolicy.package.name,
      pkgVersion: packagePolicy.package.version,
    });

    const installedPackage = await getInstallation({
      savedObjectsRepo: soRepo,
      pkgName: packagePolicy.package.name,
    });

    if (!installedPackage) {
      results.push({
        packagePolicyId,
        errors: [`${packagePolicy.package.name} is not installed`],
      });

      continue;
    }

    if (shouldUpgradePolicies(packageInfo, installedPackage)) {
      // Since upgrades don't report diffs/errors, we need to perform a dry run first in order
      // to notify the user of any granular policy upgrade errors that occur during Fleet's
      // preconfiguration check
      const dryRunResults = await packagePolicyService.getUpgradeDryRunDiff(
        soRepo,
        packagePolicyId
      );

      if (dryRunResults.hasErrors) {
        const errors = dryRunResults.diff
          ? dryRunResults.diff?.[1].errors
          : [dryRunResults.body?.message];

        appContextService
          .getLogger()
          .error(
            new Error(
              `Error upgrading package policy ${packagePolicyId}: ${JSON.stringify(errors)}`
            )
          );

        results.push({ packagePolicyId, diff: dryRunResults.diff, errors });
        continue;
      }

      try {
        await packagePolicyService.upgrade(soRepo, esClient, [packagePolicyId]);
        results.push({ packagePolicyId, diff: dryRunResults.diff, errors: [] });
      } catch (error) {
        results.push({ packagePolicyId, diff: dryRunResults.diff, errors: [error] });
      }
    }
  }

  return results;
};

export function shouldUpgradePolicies(
  packageInfo: PackageInfo,
  installedPackage: Installation
): boolean {
  const isPolicyVersionGteInstalledVersion = semverGte(
    packageInfo.version,
    installedPackage.version
  );

  return !isPolicyVersionGteInstalledVersion && !!packageInfo.keepPoliciesUpToDate;
}
