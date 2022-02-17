/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from 'src/core/server';
import semverGte from 'semver/functions/gte';

import type { UpgradePackagePolicyDryRunResponseItem } from '../../common';

import { PACKAGES_SAVED_OBJECT_TYPE, PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '../constants';

import type { Installation, PackagePolicy } from '../types';

import { appContextService } from './app_context';
import { getInstallations } from './epm/packages';
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
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient
): Promise<UpgradeManagedPackagePoliciesResult[]> => {
  const results: UpgradeManagedPackagePoliciesResult[] = [];

  const installedPackages = await getInstallations(soClient, {
    filter: `${PACKAGES_SAVED_OBJECT_TYPE}.attributes.install_status:installed`,
  });

  for (const { attributes: installedPackage } of installedPackages.saved_objects) {
    if (installedPackage.keep_policies_up_to_date) {
      const packagePolicies = await getPackagePoliciesNotMatchingVersion(
        soClient,
        installedPackage.name,
        installedPackage.version
      );

      for (const packagePolicy of packagePolicies) {
        if (isPolicyVersionGteInstalledVersion(packagePolicy, installedPackage)) {
          continue;
        }
        upgradePackagePolicy(soClient, esClient, packagePolicy.id, results);
      }
    }
  }

  return results;
};

async function getPackagePoliciesNotMatchingVersion(
  soClient: SavedObjectsClientContract,
  pkgName: string,
  pkgVersion: string
): Promise<PackagePolicy[]> {
  return (
    await packagePolicyService.list(soClient, {
      page: 1,
      perPage: 1000,
      kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${pkgName} AND NOT ${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.version:${pkgVersion}`,
    })
  ).items;
}

function isPolicyVersionGteInstalledVersion(
  packagePolicy: PackagePolicy,
  installedPackage: Installation
): boolean {
  return (
    !!packagePolicy.package &&
    !!installedPackage.version &&
    semverGte(packagePolicy.package.version, installedPackage.version)
  );
}

async function upgradePackagePolicy(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  packagePolicyId: string,
  results: UpgradeManagedPackagePoliciesResult[]
) {
  // Since upgrades don't report diffs/errors, we need to perform a dry run first in order
  // to notify the user of any granular policy upgrade errors that occur during Fleet's
  // preconfiguration check
  const dryRunResults = await packagePolicyService.getUpgradeDryRunDiff(soClient, packagePolicyId);

  if (dryRunResults.hasErrors) {
    const errors = dryRunResults.diff
      ? dryRunResults.diff?.[1].errors
      : [dryRunResults.body?.message];

    appContextService
      .getLogger()
      .error(
        new Error(`Error upgrading package policy ${packagePolicyId}: ${JSON.stringify(errors)}`)
      );

    results.push({ packagePolicyId, diff: dryRunResults.diff, errors });
    return;
  }

  try {
    await packagePolicyService.upgrade(soClient, esClient, [packagePolicyId]);
    results.push({ packagePolicyId, diff: dryRunResults.diff, errors: [] });
  } catch (error) {
    results.push({ packagePolicyId, diff: dryRunResults.diff, errors: [error] });
  }
}
