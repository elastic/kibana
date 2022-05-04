/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import type {
  ElasticsearchClient,
  SavedObjectsClientContract,
  SavedObjectsFindOptions,
} from '@kbn/core/server';
import semverGte from 'semver/functions/gte';

import type { SearchRequest } from '@elastic/elasticsearch/lib/api/types';

import {
  isPackageLimited,
  installationStatuses,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
} from '../../../../common';
import type { PackageUsageStats, PackagePolicySOAttributes } from '../../../../common';
import { PACKAGES_SAVED_OBJECT_TYPE } from '../../../constants';
import { SUGGESTION_SIGNAL_FIELDS } from '../../../../common';
import type {
  ArchivePackage,
  RegistryPackage,
  RegistrySearchResult,
  EpmPackageAdditions,
  GetCategoriesRequest,
  PackageList,
  PackageListItem,
  SuggestionSignalFields,
  Installable,
} from '../../../../common/types';
import type { Installation, PackageInfo } from '../../../types';
import { IngestManagerError, PackageNotFoundError } from '../../../errors';
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

function escapeStringRegexp(str: string) {
  // Escape characters with special meaning either inside or outside character sets.
  // Use a simple backslash escape when it’s always valid, and a `\xnn` escape when the simpler form would be disallowed by Unicode patterns’ stricter grammar.
  return str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&').replace(/-/g, '\\x2d');
}

export async function getPackages(
  options: {
    esClient: ElasticsearchClient;
    savedObjectsClient: SavedObjectsClientContract;
    excludeInstallStatus?: boolean;
    includeSuggestions?: boolean;
  } & Registry.SearchParams
): Promise<PackageList> {
  const {
    esClient,
    savedObjectsClient,
    experimental,
    category,
    excludeInstallStatus = false,
    includeSuggestions = false,
  } = options;
  const [registryItems, packageSavedObjects] = await Promise.all([
    Registry.fetchList({ category, experimental }).then((items) => {
      return items.map((item) =>
        Object.assign({}, item, { title: item.title || nameAsTitle(item.name) }, { id: item.name })
      );
    }),
    getPackageSavedObjects(savedObjectsClient),
  ]);

  let packages = registryItems
    .map((item) =>
      createInstallableFrom(
        item,
        packageSavedObjects.saved_objects.find(({ id }) => id === item.name)
      )
    )
    .sort(sortByName);

  if (includeSuggestions) {
    const suggestionScores = await getSuggestionScores({
      esClient,
      // Avoid calculating suggestions for packages that are already installed
      packages: packages.filter((i) => i.status === installationStatuses.NotInstalled),
    });

    packages = packages.map((installable) => {
      return {
        ...installable,
        suggestionScore:
          suggestionScores.find((score) => score.id === installable.id)?.suggestionScore || 0,
      };
    });
  }

  if (!excludeInstallStatus) {
    return packages;
  }

  // Exclude the `installStatus` value if the `excludeInstallStatus` query parameter is set to true
  // to better facilitate response caching
  const packageListWithoutStatus = packages.map((pkg) => {
    const newPkg = {
      ...pkg,
      status: undefined,
    };

    return newPkg;
  });

  return packageListWithoutStatus;
}

export async function getSuggestionScores(options: {
  esClient: ElasticsearchClient;
  packages: Array<Installable<RegistrySearchResult>>;
}): Promise<Array<Pick<PackageListItem, 'id' | 'suggestionScore'>>> {
  const { esClient, packages } = options;
  const itemsWithSignals = packages.filter(({ suggestion_signals }) => suggestion_signals);

  const queryResults = Object.fromEntries(
    await Promise.all(
      SUGGESTION_SIGNAL_FIELDS.map(
        async (
          field
        ): Promise<[SuggestionSignalFields, Array<{ key: string; doc_count: number }>]> => {
          const searchValues = itemsWithSignals
            .filter(({ suggestion_signals }) => suggestion_signals && field in suggestion_signals)
            .flatMap((item) => item.suggestion_signals![field]);

          const searchRequest: SearchRequest = {
            index: 'logs-*-*,metrics-*-*',
            size: 0,
            query: {
              bool: {
                should: searchValues.map((value) => ({
                  wildcard: { [field]: value },
                })),
                filter: [
                  {
                    range: {
                      '@timestamp': {
                        gte: 'now-1h',
                      },
                    },
                  },
                ],
              },
            },
            aggs: {
              sample: {
                sampler: {
                  shard_size: 100,
                },
                aggs: {
                  top_values: {
                    terms: {
                      field,
                      size: 50,
                    },
                  },
                },
              },
            },
          };

          /** naive implementation, may be possible to optimize further (eg. random sampler when doc count is high) */
          const response = await esClient.search<
            null,
            { sample: { top_values: { buckets: Array<{ key: string; doc_count: number }> } } }
          >(searchRequest);

          // Use top values to rank the signals
          return [field, response.aggregations?.sample.top_values.buckets ?? []];
        }
      )
    )
  );

  // detect buckets that match the signals and add doc count to score
  return itemsWithSignals.map(({ name, suggestion_signals }) => {
    let suggestionScore = 0;

    SUGGESTION_SIGNAL_FIELDS.map((field) => {
      const buckets = queryResults[field];
      const signals = suggestion_signals![field] || [];

      signals.forEach((signal) => {
        // Replace wildcards with regex wildcard and escape all other regexp characters
        const regex = new RegExp(escapeStringRegexp(signal).replace(/\*/g, '.*'));
        buckets.forEach(({ key, doc_count }) => {
          if (key.match(regex)) {
            suggestionScore += doc_count;
          }
        });
      });
    });

    return {
      id: name,
      suggestionScore,
    };
  });
}

// Get package names for packages which cannot have more than one package policy on an agent policy
export async function getLimitedPackages(options: {
  esClient: ElasticsearchClient;
  savedObjectsClient: SavedObjectsClientContract;
}): Promise<string[]> {
  const { esClient, savedObjectsClient } = options;
  const allPackages = await getPackages({
    esClient,
    savedObjectsClient,
    experimental: true,
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
}: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgName: string;
  pkgVersion: string;
  /** Avoid loading the registry archive into the cache (only use for performance reasons). Defaults to `false` */
  skipArchive?: boolean;
}): Promise<PackageInfo> {
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

  // If same version is available in registry and skipArchive is true, use the info from the registry (faster),
  // otherwise build it from the archive
  let paths: string[];
  let packageInfo: RegistryPackage | ArchivePackage | undefined = skipArchive
    ? await Registry.fetchInfo(pkgName, pkgVersion).catch(() => undefined)
    : undefined;

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
    latestVersion:
      latestPackage?.version && semverGte(latestPackage.version, resolvedPkgVersion)
        ? latestPackage.version
        : resolvedPkgVersion,
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
