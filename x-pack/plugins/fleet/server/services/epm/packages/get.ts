/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import pMap from 'p-map';
import type { SavedObjectsClientContract, SavedObjectsFindOptions } from '@kbn/core/server';
import semverGte from 'semver/functions/gte';
import type { Logger } from '@kbn/core/server';
import { withSpan } from '@kbn/apm-utils';

import type { SortResults } from '@elastic/elasticsearch/lib/api/types';

import { nodeBuilder } from '@kbn/es-query';

import { buildNode as buildFunctionNode } from '@kbn/es-query/src/kuery/node_types/function';
import { buildNode as buildWildcardNode } from '@kbn/es-query/src/kuery/node_types/wildcard';

import {
  installationStatuses,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  SO_SEARCH_LIMIT,
} from '../../../../common/constants';
import { isPackageLimited } from '../../../../common/services';
import type {
  PackageUsageStats,
  Installable,
  PackageDataStreamTypes,
} from '../../../../common/types';
import { PACKAGES_SAVED_OBJECT_TYPE } from '../../../constants';
import type {
  ArchivePackage,
  RegistryPackage,
  EpmPackageAdditions,
  GetCategoriesRequest,
} from '../../../../common/types';
import type { Installation, PackageInfo, PackagePolicySOAttributes } from '../../../types';
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

import { auditLoggingService } from '../../audit_logging';

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
  const MAX_PKGS_TO_LOAD_TITLE = 10;

  const packagesNotInRegistry = packageSavedObjects.saved_objects.filter(
    (pkg) => !registryItems.some((item) => item.name === pkg.id)
  );

  const uploadedPackagesNotInRegistry = await pMap(
    packagesNotInRegistry.entries(),
    async ([i, pkg]) => {
      // fetching info of uploaded packages to populate title, description
      // limit to 10 for performance
      if (i < MAX_PKGS_TO_LOAD_TITLE) {
        const packageInfo = await withSpan({ name: 'get-package-info', type: 'package' }, () =>
          getPackageInfo({
            savedObjectsClient,
            pkgName: pkg.id,
            pkgVersion: pkg.attributes.version,
          })
        );
        return createInstallableFrom({ ...packageInfo, id: pkg.id }, pkg);
      } else {
        return createInstallableFrom(
          { ...pkg.attributes, title: nameAsTitle(pkg.id), id: pkg.id },
          pkg
        );
      }
    },
    { concurrency: 10 }
  );

  const packageList = registryItems
    .map((item) =>
      createInstallableFrom(
        item,
        packageSavedObjects.saved_objects.find(({ id }) => id === item.name)
      )
    )
    .concat(uploadedPackagesNotInRegistry as Installable<any>)
    .sort(sortByName);

  for (const pkg of packageList) {
    auditLoggingService.writeCustomSoAuditLog({
      action: 'get',
      id: pkg.id,
      savedObjectType: PACKAGES_SAVED_OBJECT_TYPE,
    });
  }

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

interface GetInstalledPackagesOptions {
  savedObjectsClient: SavedObjectsClientContract;
  dataStreamType?: PackageDataStreamTypes;
  nameQuery?: string;
  searchAfter?: SortResults;
  perPage: number;
  sortOrder: 'asc' | 'desc';
}
export async function getInstalledPackages(options: GetInstalledPackagesOptions) {
  const { savedObjectsClient, ...otherOptions } = options;
  const { dataStreamType } = otherOptions;

  const packageSavedObjects = await getInstalledPackageSavedObjects(
    savedObjectsClient,
    otherOptions
  );

  const integrations = packageSavedObjects.saved_objects.map((integrationSavedObject) => {
    const {
      name,
      version,
      install_status: installStatus,
      es_index_patterns: esIndexPatterns,
    } = integrationSavedObject.attributes;

    const dataStreams = getInstalledPackageSavedObjectDataStreams(esIndexPatterns, dataStreamType);

    return {
      name,
      version,
      status: installStatus,
      dataStreams,
    };
  });

  return {
    items: integrations,
    total: packageSavedObjects.total,
    searchAfter: packageSavedObjects.saved_objects.at(-1)?.sort, // Enable ability to use searchAfter in subsequent queries
  };
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

  const packages = installedPackagesInfo.filter(isPackageLimited).map((pkgInfo) => pkgInfo.name);

  for (const pkg of installedPackages) {
    auditLoggingService.writeCustomSoAuditLog({
      action: 'find',
      id: pkg.id,
      savedObjectType: PACKAGES_SAVED_OBJECT_TYPE,
    });
  }

  return packages;
}

export async function getPackageSavedObjects(
  savedObjectsClient: SavedObjectsClientContract,
  options?: Omit<SavedObjectsFindOptions, 'type'>
) {
  const result = await savedObjectsClient.find<Installation>({
    ...(options || {}),
    type: PACKAGES_SAVED_OBJECT_TYPE,
    perPage: SO_SEARCH_LIMIT,
  });

  for (const savedObject of result.saved_objects) {
    auditLoggingService.writeCustomSoAuditLog({
      action: 'find',
      id: savedObject.id,
      savedObjectType: PACKAGES_SAVED_OBJECT_TYPE,
    });
  }

  return result;
}

export async function getInstalledPackageSavedObjects(
  savedObjectsClient: SavedObjectsClientContract,
  options: Omit<GetInstalledPackagesOptions, 'savedObjectsClient'>
) {
  const { searchAfter, sortOrder, perPage, nameQuery, dataStreamType } = options;

  const result = await savedObjectsClient.find<Installation>({
    type: PACKAGES_SAVED_OBJECT_TYPE,
    // Pagination
    perPage,
    ...(searchAfter && { searchAfter }),
    // Sort
    sortField: 'name',
    sortOrder,
    // Name filter
    ...(nameQuery && { searchFields: ['name'] }),
    ...(nameQuery && { search: `${nameQuery}* | ${nameQuery}` }),
    filter: nodeBuilder.and([
      // Filter to installed packages only
      nodeBuilder.is(
        `${PACKAGES_SAVED_OBJECT_TYPE}.attributes.install_status`,
        installationStatuses.Installed
      ),
      // Filter for a "queryable" marker
      buildFunctionNode(
        'nested',
        `${PACKAGES_SAVED_OBJECT_TYPE}.attributes.installed_es`,
        nodeBuilder.is('type', 'index_template')
      ),
      // "Type" filter
      ...(dataStreamType
        ? [
            buildFunctionNode(
              'nested',
              `${PACKAGES_SAVED_OBJECT_TYPE}.attributes.installed_es`,
              nodeBuilder.is('id', buildWildcardNode(`${dataStreamType}-*`))
            ),
          ]
        : []),
    ]),
  });

  for (const savedObject of result.saved_objects) {
    auditLoggingService.writeCustomSoAuditLog({
      action: 'find',
      id: savedObject.id,
      savedObjectType: PACKAGES_SAVED_OBJECT_TYPE,
    });
  }

  return result;
}

function getInstalledPackageSavedObjectDataStreams(
  indexPatterns: Record<string, string>,
  dataStreamType?: string
) {
  return Object.entries(indexPatterns)
    .map(([key, value]) => {
      return {
        name: value,
        title: key,
      };
    })
    .filter((stream) => {
      if (!dataStreamType) {
        return true;
      } else {
        return stream.name.startsWith(`${dataStreamType}-`);
      }
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

    for (const packagePolicy of packagePolicies.saved_objects) {
      auditLoggingService.writeCustomSoAuditLog({
        action: 'find',
        id: packagePolicy.id,
        savedObjectType: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
      });
    }

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
  const installation = await savedObjectsClient
    .get<Installation>(PACKAGES_SAVED_OBJECT_TYPE, pkgName)
    .catch((e) => {
      logger?.error(e);
      return undefined;
    });

  if (!installation) {
    return;
  }

  auditLoggingService.writeCustomSoAuditLog({
    action: 'find',
    id: installation.id,
    savedObjectType: PACKAGES_SAVED_OBJECT_TYPE,
  });

  return installation;
}

export async function getInstallationObjects(options: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgNames: string[];
}) {
  const { savedObjectsClient, pkgNames } = options;
  const res = await savedObjectsClient.bulkGet<Installation>(
    pkgNames.map((pkgName) => ({ id: pkgName, type: PACKAGES_SAVED_OBJECT_TYPE }))
  );

  const installations = res.saved_objects.filter((so) => so?.attributes);

  for (const installation of installations) {
    auditLoggingService.writeCustomSoAuditLog({
      action: 'find',
      id: installation.id,
      savedObjectType: PACKAGES_SAVED_OBJECT_TYPE,
    });
  }

  return installations;
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
