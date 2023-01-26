/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract, SavedObjectsFindOptions } from '@kbn/core/server';
import semverGte from 'semver/functions/gte';
import type { Logger } from '@kbn/core/server';

import {
  installationStatuses,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
} from '../../../../common/constants';
import { isPackageLimited } from '../../../../common/services';
import type { PackageUsageStats, PackagePolicySOAttributes } from '../../../../common/types';
import { PACKAGES_SAVED_OBJECT_TYPE } from '../../../constants';
import type {
  ArchivePackage,
  RegistryPackage,
  EpmPackageAdditions,
  GetCategoriesRequest,
} from '../../../../common/types';
import type { Installation, PackageInfo } from '../../../types';
import {
  FleetError,
  PackageFailedVerificationError,
  PackageNotFoundError,
  RegistryResponseError,
} from '../../../errors';
import { appContextService } from '../..';
import * as Registry from '../registry';
import { getEsPackage } from '../archive/storage';
import { getArchivePackage } from '../archive';
import { normalizeKuery } from '../../saved_object';

import { createInstallableFrom } from '.';

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
    excludeInstallStatus?: boolean;
  } & Registry.SearchParams
) {
  const {
    savedObjectsClient,
    category,
    excludeInstallStatus = false,
    prerelease = false,
  } = options;

  const registryItems = await Registry.fetchList({ category, prerelease }).then((items) => {
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

  if (!excludeInstallStatus) {
    return packageList;
  }

  // Exclude the `installStatus` value if the `excludeInstallStatus` query parameter is set to true
  // to better facilitate response caching
  const packageListWithoutStatus = packageList.map((pkg) => {
    const newPkg = {
      ...pkg,
      status: undefined,
    };

    return newPkg;
  });

  return packageListWithoutStatus;
}

// Get package names for packages which cannot have more than one package policy on an agent policy
export async function getLimitedPackages(options: {
  savedObjectsClient: SavedObjectsClientContract;
  prerelease?: boolean;
}): Promise<string[]> {
  const { savedObjectsClient, prerelease } = options;
  const allPackages = await getPackages({
    savedObjectsClient,
    prerelease,
  });
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

export async function getPackageInfo({
  savedObjectsClient,
  pkgName,
  pkgVersion,
  skipArchive = false,
  ignoreUnverified = false,
  prerelease,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgName: string;
  pkgVersion: string;
  /** Avoid loading the registry archive into the cache (only use for performance reasons). Defaults to `false` */
  skipArchive?: boolean;
  ignoreUnverified?: boolean;
  prerelease?: boolean;
}): Promise<PackageInfo> {
  const [savedObject, latestPackage] = await Promise.all([
    getInstallationObject({ savedObjectsClient, pkgName }),
    Registry.fetchFindLatestPackageOrUndefined(pkgName, { prerelease }),
  ]);

  if (!savedObject && !latestPackage) {
    throw new PackageNotFoundError(`[${pkgName}] package not installed or found in registry`);
  }

  // If no package version is provided, use the installed version in the response, fallback to package from registry
  const resolvedPkgVersion =
    pkgVersion !== ''
      ? pkgVersion
      : savedObject?.attributes.install_version ?? latestPackage!.version;

  // If same version is available in registry and skipArchive is true, use the info from the registry (faster),
  // otherwise build it from the archive
  let paths: string[];
  const registryInfo = await Registry.fetchInfo(pkgName, resolvedPkgVersion).catch(() => undefined);
  let packageInfo;
  // We need to get input only packages from source to get all fields
  // see https://github.com/elastic/package-registry/issues/864
  if (registryInfo && skipArchive && registryInfo.type !== 'input') {
    packageInfo = registryInfo;
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
      ignoreUnverified,
    }));
  }

  // add properties that aren't (or aren't yet) on the package
  const additions: EpmPackageAdditions = {
    latestVersion:
      latestPackage?.version && semverGte(latestPackage.version, resolvedPkgVersion)
        ? latestPackage.version
        : resolvedPkgVersion,
    title: packageInfo.title || nameAsTitle(packageInfo.name),
    assets: Registry.groupPathsByService(paths || []),
    notice: Registry.getNoticePath(paths || []),
    licensePath: Registry.getLicensePath(paths || []),
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

// gets package from install_source
export async function getPackageFromSource(options: {
  pkgName: string;
  pkgVersion: string;
  installedPkg?: Installation;
  savedObjectsClient: SavedObjectsClientContract;
  ignoreUnverified?: boolean;
}): Promise<PackageResponse> {
  const logger = appContextService.getLogger();
  const {
    pkgName,
    pkgVersion,
    installedPkg,
    savedObjectsClient,
    ignoreUnverified = false,
  } = options;
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
    // install source is now archive in all cases
    // See https://github.com/elastic/kibana/issues/115032
    if (!res && pkgInstallSource === 'registry') {
      try {
        res = await Registry.getPackage(pkgName, pkgVersion);
        logger.debug(`retrieved installed package ${pkgName}-${pkgVersion}`);
      } catch (error) {
        if (error instanceof PackageFailedVerificationError) {
          throw error;
        }
        // treating this is a 404 as no status code returned
        // in the unlikely event its missing from cache, storage, and never installed from registry
      }
    }
  } else {
    res = getArchivePackage({ name: pkgName, version: pkgVersion });

    if (res) {
      logger.debug(`retrieved package ${pkgName}-${pkgVersion} from cache`);
    } else {
      try {
        res = await Registry.getPackage(pkgName, pkgVersion, { ignoreUnverified });
        logger.debug(`retrieved package ${pkgName}-${pkgVersion} from registry`);
      } catch (err) {
        if (err instanceof RegistryResponseError && err.status === 404) {
          res = await Registry.getBundledArchive(pkgName, pkgVersion);
        } else {
          throw err;
        }
      }
    }
  }
  if (!res) {
    throw new FleetError(`package info for ${pkgName}-${pkgVersion} does not exist`);
  }
  return {
    paths: res.paths,
    packageInfo: res.packageInfo,
  };
}

export async function getInstallationObject(options: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgName: string;
  logger?: Logger;
}) {
  const { savedObjectsClient, pkgName, logger } = options;
  return savedObjectsClient.get<Installation>(PACKAGES_SAVED_OBJECT_TYPE, pkgName).catch((e) => {
    logger?.error(e);
    return undefined;
  });
}

export async function getInstallationObjects(options: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgNames: string[];
}) {
  const { savedObjectsClient, pkgNames } = options;
  const res = await savedObjectsClient.bulkGet<Installation>(
    pkgNames.map((pkgName) => ({ id: pkgName, type: PACKAGES_SAVED_OBJECT_TYPE }))
  );

  return res.saved_objects.filter((so) => so?.attributes);
}

export async function getInstallation(options: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgName: string;
  logger?: Logger;
}) {
  const savedObject = await getInstallationObject(options);
  return savedObject?.attributes;
}

export async function getInstallationsByName(options: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgNames: string[];
}) {
  const savedObjects = await getInstallationObjects(options);
  return savedObjects.map((so) => so.attributes);
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
