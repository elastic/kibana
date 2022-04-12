/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract, SavedObjectsFindOptions } from 'src/core/server';
import semverGte from 'semver/functions/gte';

import {
  isPackageLimited,
  installationStatuses,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
} from '../../../../common';
import type { PackageUsageStats, PackagePolicySOAttributes } from '../../../../common';
import { PACKAGES_SAVED_OBJECT_TYPE } from '../../../constants';
import type {
  ArchivePackage,
  RegistryPackage,
  EpmPackageAdditions,
  GetCategoriesRequest,
} from '../../../../common/types';
import type { Installation, PackageInfo } from '../../../types';
import { IngestManagerError, PackageNotFoundError } from '../../../errors';
import { appContextService } from '../../';
import * as Registry from '../registry';
import { getEsPackage } from '../archive/storage';
import { getArchivePackage } from '../archive';
import { normalizeKuery } from '../../saved_object';

import { createInstallableFrom } from './index';

export type { SearchParams } from '../registry';
export { getFile } from '../registry';

function nameAsTitle(name: string) {
  return name.charAt(0).toUpperCase() + name.substr(1).toLowerCase();
}

export async function getCategories(options: GetCategoriesRequest['query']) {
  return Registry.fetchCategories(options);
}

export async function getPackages(
  options: {
    savedObjectsClient: SavedObjectsClientContract;
  } & Registry.SearchParams
) {
  const { savedObjectsClient, experimental, category } = options;
  const registryItems = await Registry.fetchList({ category, experimental }).then((items) => {
    return items.map((item) =>
      Object.assign({}, item, { title: item.title || nameAsTitle(item.name) }, { id: item.name })
    );
  });
  // get the installed packages
  const packageSavedObjects = await getPackageSavedObjects(savedObjectsClient);
  const packageList = registryItems
    .map((item) =>
      createInstallableFrom(
        item,
        packageSavedObjects.saved_objects.find(({ id }) => id === item.name)
      )
    )
    .sort(sortByName);
  return packageList;
}

// Get package names for packages which cannot have more than one package policy on an agent policy
export async function getLimitedPackages(options: {
  savedObjectsClient: SavedObjectsClientContract;
}): Promise<string[]> {
  const { savedObjectsClient } = options;
  const allPackages = await getPackages({ savedObjectsClient, experimental: true });
  const installedPackages = allPackages.filter(
    (pkg) => pkg.status === installationStatuses.Installed
  );
  const installedPackagesInfo = await Promise.all(
    installedPackages.map((pkgInstall) => {
      return getPackageInfo({
        savedObjectsClient,
        pkgName: pkgInstall.name,
        pkgVersion: pkgInstall.version,
      });
    })
  );
  return installedPackagesInfo.filter(isPackageLimited).map((pkgInfo) => pkgInfo.name);
}

export async function getPackageSavedObjects(
  savedObjectsClient: SavedObjectsClientContract,
  options?: Omit<SavedObjectsFindOptions, 'type'>
) {
  return savedObjectsClient.find<Installation>({
    ...(options || {}),
    type: PACKAGES_SAVED_OBJECT_TYPE,
  });
}

export const getInstallations = getPackageSavedObjects;

export async function getPackageInfo(options: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgName: string;
  pkgVersion: string;
}): Promise<PackageInfo> {
  const { savedObjectsClient, pkgName, pkgVersion } = options;

  const [savedObject, latestPackage] = await Promise.all([
    getInstallationObject({ savedObjectsClient, pkgName }),
    Registry.fetchFindLatestPackageOrUndefined(pkgName),
  ]);

  if (!savedObject && !latestPackage) {
    throw new PackageNotFoundError(`[${pkgName}] package not installed or found in registry`);
  }

  // If no package version is provided, use the installed version in the response, fallback to package from registry
  const resolvedPkgVersion =
    pkgVersion !== ''
      ? pkgVersion
      : savedObject?.attributes.install_version ?? latestPackage!.version;

  // If same version is available in registry, use the info from the registry (faster), otherwise build it from the archive
  let paths: string[];
  let packageInfo: RegistryPackage | ArchivePackage | undefined = await Registry.fetchInfo(
    pkgName,
    pkgVersion
  ).catch(() => undefined);

  if (packageInfo) {
    // Fix the paths
    paths =
      packageInfo.assets?.map((path) =>
        path.replace(`/package/${pkgName}/${pkgVersion}`, `${pkgName}-${pkgVersion}`)
      ) ?? [];
  } else {
    ({ paths, packageInfo } = await getPackageFromSource({
      pkgName,
      pkgVersion: resolvedPkgVersion,
      savedObjectsClient,
      installedPkg: savedObject?.attributes,
    }));
  }

  // add properties that aren't (or aren't yet) on the package
  const additions: EpmPackageAdditions = {
    latestVersion: latestPackage?.version ?? resolvedPkgVersion,
    title: packageInfo.title || nameAsTitle(packageInfo.name),
    assets: Registry.groupPathsByService(paths || []),
    removable: true,
    notice: Registry.getNoticePath(paths || []),
    keepPoliciesUpToDate: savedObject?.attributes.keep_policies_up_to_date ?? false,
  };
  const updated = { ...packageInfo, ...additions };

  return createInstallableFrom(updated, savedObject);
}

export const getPackageUsageStats = async ({
  savedObjectsClient,
  pkgName,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgName: string;
}): Promise<PackageUsageStats> => {
  const filter = normalizeKuery(
    PACKAGE_POLICY_SAVED_OBJECT_TYPE,
    `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name: ${pkgName}`
  );
  const agentPolicyCount = new Set<string>();
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    // using saved Objects client directly, instead of the `list()` method of `package_policy` service
    // in order to not cause a circular dependency (package policy service imports from this module)
    const packagePolicies = await savedObjectsClient.find<PackagePolicySOAttributes>({
      type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
      perPage: 1000,
      page: page++,
      filter,
    });

    for (let index = 0, total = packagePolicies.saved_objects.length; index < total; index++) {
      agentPolicyCount.add(packagePolicies.saved_objects[index].attributes.policy_id);
    }

    hasMore = packagePolicies.saved_objects.length > 0;
  }

  return {
    agent_policy_count: agentPolicyCount.size,
  };
};

interface PackageResponse {
  paths: string[];
  packageInfo: ArchivePackage | RegistryPackage;
}
type GetPackageResponse = PackageResponse | undefined;

// gets package from install_source if it exists otherwise gets from registry
export async function getPackageFromSource(options: {
  pkgName: string;
  pkgVersion: string;
  installedPkg?: Installation;
  savedObjectsClient: SavedObjectsClientContract;
}): Promise<PackageResponse> {
  const logger = appContextService.getLogger();
  const { pkgName, pkgVersion, installedPkg, savedObjectsClient } = options;
  let res: GetPackageResponse;

  // If the package is installed
  if (installedPkg && installedPkg.version === pkgVersion) {
    const { install_source: pkgInstallSource } = installedPkg;
    // check cache
    res = getArchivePackage({
      name: pkgName,
      version: pkgVersion,
    });

    if (res) {
      logger.debug(`retrieved installed package ${pkgName}-${pkgVersion} from cache`);
    }

    if (!res && installedPkg.package_assets) {
      res = await getEsPackage(
        pkgName,
        pkgVersion,
        installedPkg.package_assets,
        savedObjectsClient
      );

      if (res) {
        logger.debug(`retrieved installed package ${pkgName}-${pkgVersion} from ES`);
      }
    }
    // for packages not in cache or package storage and installed from registry, check registry
    if (!res && pkgInstallSource === 'registry') {
      try {
        res = await Registry.getRegistryPackage(pkgName, pkgVersion);
        logger.debug(`retrieved installed package ${pkgName}-${pkgVersion} from registry`);
        // TODO: add to cache and storage here?
      } catch (error) {
        // treating this is a 404 as no status code returned
        // in the unlikely event its missing from cache, storage, and never installed from registry
      }
    }
  } else {
    // else package is not installed or installed and missing from cache and storage and installed from registry
    res = await Registry.getRegistryPackage(pkgName, pkgVersion);
    logger.debug(`retrieved uninstalled package ${pkgName}-${pkgVersion} from registry`);
  }
  if (!res) {
    throw new IngestManagerError(`package info for ${pkgName}-${pkgVersion} does not exist`);
  }
  return {
    paths: res.paths,
    packageInfo: res.packageInfo,
  };
}

export async function getInstallationObject(options: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgName: string;
}) {
  const { savedObjectsClient, pkgName } = options;
  return savedObjectsClient
    .get<Installation>(PACKAGES_SAVED_OBJECT_TYPE, pkgName)
    .catch((e) => undefined);
}

export async function getInstallation(options: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgName: string;
}) {
  const savedObject = await getInstallationObject(options);
  return savedObject?.attributes;
}

function sortByName(a: { name: string }, b: { name: string }) {
  if (a.name > b.name) {
    return 1;
  } else if (a.name < b.name) {
    return -1;
  } else {
    return 0;
  }
}
