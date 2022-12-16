/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { URL } from 'url';

import mime from 'mime-types';
import semverGte from 'semver/functions/gte';

import type { Response } from 'node-fetch';
import type { Logger } from '@kbn/logging';

import { splitPkgKey as split } from '../../../../common/services';

import { KibanaAssetType } from '../../../types';
import type {
  AssetsGroupedByServiceByType,
  CategoryId,
  CategorySummaryList,
  RegistryPackage,
  RegistrySearchResults,
  GetCategoriesRequest,
  PackageVerificationResult,
  ArchivePackage,
  BundledPackage,
} from '../../../types';
import {
  getArchiveFilelist,
  getPathParts,
  unpackBufferToCache,
  setVerificationResult,
  getVerificationResult,
  getPackageInfo,
  setPackageInfo,
  generatePackageInfoFromArchiveBuffer,
} from '../archive';
import { streamToBuffer, streamToString } from '../streams';
import { appContextService } from '../..';
import {
  PackageNotFoundError,
  RegistryResponseError,
  PackageFailedVerificationError,
} from '../../../errors';

import { getBundledPackageByName } from '../packages/bundled_packages';

import { withPackageSpan } from '../packages/utils';

import { verifyPackageArchiveSignature } from '../packages/package_verification';

import { fetchUrl, getResponse, getResponseStream } from './requests';
import { getRegistryUrl } from './registry_url';

export interface SearchParams {
  category?: CategoryId;
  prerelease?: boolean;
  // deprecated
  experimental?: boolean;
}

export const splitPkgKey = split;

export const pkgToPkgKey = ({ name, version }: { name: string; version: string }) =>
  `${name}-${version}`;

export async function fetchList(params?: SearchParams): Promise<RegistrySearchResults> {
  const registryUrl = getRegistryUrl();
  const url = new URL(`${registryUrl}/search`);
  if (params) {
    if (params.category) {
      url.searchParams.set('category', params.category);
    }
    if (params.prerelease) {
      url.searchParams.set('prerelease', params.prerelease.toString());
    }
  }

  setKibanaVersion(url);

  return fetchUrl(url.toString()).then(JSON.parse);
}

export interface FetchFindLatestPackageOptions {
  ignoreConstraints?: boolean;
  prerelease?: boolean;
}

async function _fetchFindLatestPackage(
  packageName: string,
  options?: FetchFindLatestPackageOptions
): Promise<RegistryPackage | BundledPackage | null> {
  return withPackageSpan(`Find latest package ${packageName}`, async () => {
    const logger = appContextService.getLogger();
    const { ignoreConstraints = false, prerelease = false } = options ?? {};

    const bundledPackage = await getBundledPackageByName(packageName);

    // temporary workaround to allow synthetics package beta version until there is a GA available
    // needed because synthetics is installed by default on kibana startup
    const prereleaseAllowedExceptions = ['synthetics'];

    const prereleaseEnabled = prerelease || prereleaseAllowedExceptions.includes(packageName);

    const registryUrl = getRegistryUrl();
    const url = new URL(
      `${registryUrl}/search?package=${packageName}&prerelease=${prereleaseEnabled}`
    );

    if (!ignoreConstraints) {
      setKibanaVersion(url);
    }

    try {
      const res = await fetchUrl(url.toString(), 1);
      const searchResults: RegistryPackage[] = JSON.parse(res);

      const latestPackageFromRegistry = searchResults[0] ?? null;

      if (bundledPackage && semverGte(bundledPackage.version, latestPackageFromRegistry.version)) {
        return bundledPackage;
      }

      return latestPackageFromRegistry;
    } catch (error) {
      logger.error(
        `Failed to fetch latest version of ${packageName} from registry: ${error.message}`
      );

      // Fall back to the bundled version of the package if it exists
      if (bundledPackage) {
        return bundledPackage;
      }

      // Otherwise, return null and allow callers to determine whether they'll consider this an error or not
      return null;
    }
  });
}

export async function fetchFindLatestPackageOrThrow(
  packageName: string,
  options?: FetchFindLatestPackageOptions
) {
  const latestPackage = await _fetchFindLatestPackage(packageName, options);

  if (!latestPackage) {
    throw new PackageNotFoundError(`[${packageName}] package not found in registry`);
  }

  return latestPackage;
}

export async function fetchFindLatestPackageOrUndefined(
  packageName: string,
  options?: FetchFindLatestPackageOptions
) {
  const logger = appContextService.getLogger();

  try {
    const latestPackage = await _fetchFindLatestPackage(packageName, options);

    if (!latestPackage) {
      return undefined;
    }
    return latestPackage;
  } catch (error) {
    logger.warn(`Error fetching latest package for ${packageName}: ${error.message}`);
    return undefined;
  }
}

export async function fetchInfo(
  pkgName: string,
  pkgVersion: string
): Promise<RegistryPackage | ArchivePackage> {
  const registryUrl = getRegistryUrl();
  try {
    // Trailing slash avoids 301 redirect / extra hop
    const res = await fetchUrl(`${registryUrl}/package/${pkgName}/${pkgVersion}/`).then(JSON.parse);

    return res;
  } catch (err) {
    if (err instanceof RegistryResponseError && err.status === 404) {
      const archivePackage = await getBundledArchive(pkgName, pkgVersion);
      if (archivePackage) {
        return archivePackage.packageInfo;
      }
      throw new PackageNotFoundError(`${pkgName}@${pkgVersion} not found`);
    }
    throw err;
  }
}

export async function getBundledArchive(
  pkgName: string,
  pkgVersion: string
): Promise<{ paths: string[]; packageInfo: ArchivePackage } | undefined> {
  // Check bundled packages in case the exact package being requested is available on disk
  const bundledPackage = await getBundledPackageByName(pkgName);

  if (bundledPackage && bundledPackage.version === pkgVersion) {
    const archivePackage = await generatePackageInfoFromArchiveBuffer(
      bundledPackage.buffer,
      'application/zip'
    );

    return archivePackage;
  }
}

export async function getFile(
  pkgName: string,
  pkgVersion: string,
  relPath: string
): Promise<Response> {
  const filePath = `/package/${pkgName}/${pkgVersion}/${relPath}`;
  return fetchFile(filePath);
}

export async function fetchFile(filePath: string): Promise<Response> {
  const registryUrl = getRegistryUrl();
  return getResponse(`${registryUrl}${filePath}`);
}

function setKibanaVersion(url: URL) {
  const disableVersionCheck =
    appContextService.getConfig()?.developer?.disableRegistryVersionCheck ?? false;
  if (disableVersionCheck) {
    return;
  }

  const kibanaVersion = appContextService.getKibanaVersion().split('-')[0]; // may be x.y.z-SNAPSHOT

  if (kibanaVersion) {
    url.searchParams.set('kibana.version', kibanaVersion);
  }
}

export async function fetchCategories(
  params?: GetCategoriesRequest['query']
): Promise<CategorySummaryList> {
  const registryUrl = getRegistryUrl();
  const url = new URL(`${registryUrl}/categories`);
  if (params) {
    if (params.prerelease) {
      url.searchParams.set('prerelease', params.prerelease.toString());
    }
    if (params.include_policy_templates) {
      url.searchParams.set('include_policy_templates', params.include_policy_templates.toString());
    }
  }

  setKibanaVersion(url);

  return fetchUrl(url.toString()).then(JSON.parse);
}

export async function getInfo(name: string, version: string) {
  return withPackageSpan('Fetch package info', async () => {
    const packageInfo = await fetchInfo(name, version);
    return packageInfo as RegistryPackage;
  });
}

// Check that the packageInfo exists in cache
// If not, retrieve it from the archive
async function getPackageInfoFromArchiveOrCache(
  name: string,
  version: string,
  archiveBuffer: Buffer,
  archivePath: string
): Promise<ArchivePackage> {
  const cachedInfo = getPackageInfo({ name, version });
  if (!cachedInfo) {
    const { packageInfo } = await generatePackageInfoFromArchiveBuffer(
      archiveBuffer,
      ensureContentType(archivePath)
    );
    setPackageInfo({ packageInfo, name, version });
    return packageInfo;
  } else {
    return cachedInfo;
  }
}

export async function getPackage(
  name: string,
  version: string,
  options?: { ignoreUnverified?: boolean }
): Promise<{
  paths: string[];
  packageInfo: ArchivePackage;
  verificationResult?: PackageVerificationResult;
}> {
  const verifyPackage = appContextService.getExperimentalFeatures().packageVerification;
  let paths = getArchiveFilelist({ name, version });
  let packageInfo = getPackageInfo({ name, version });
  let verificationResult = verifyPackage ? getVerificationResult({ name, version }) : undefined;

  if (paths && packageInfo) {
    return { paths, packageInfo, verificationResult };
  }
  const {
    archiveBuffer,
    archivePath,
    verificationResult: latestVerificationResult,
  } = await withPackageSpan('Fetch package archive from archive buffer', () =>
    fetchArchiveBuffer({
      pkgName: name,
      pkgVersion: version,
      shouldVerify: verifyPackage,
      ignoreUnverified: options?.ignoreUnverified,
    })
  );

  if (latestVerificationResult) {
    verificationResult = latestVerificationResult;
    setVerificationResult({ name, version }, latestVerificationResult);
  }
  if (!paths || paths.length === 0) {
    paths = await withPackageSpan('Unpack archive', () =>
      unpackBufferToCache({
        name,
        version,
        archiveBuffer,
        contentType: ensureContentType(archivePath),
      })
    );
  }

  if (!packageInfo) {
    packageInfo = await getPackageInfoFromArchiveOrCache(name, version, archiveBuffer, archivePath);
  }

  return { paths, packageInfo, verificationResult };
}

function ensureContentType(archivePath: string) {
  const contentType = mime.lookup(archivePath);
  if (!contentType) {
    throw new Error(`Unknown compression format for '${archivePath}'. Please use .zip or .gz`);
  }
  return contentType;
}

export async function fetchArchiveBuffer({
  pkgName,
  pkgVersion,
  shouldVerify,
  ignoreUnverified = false,
}: {
  pkgName: string;
  pkgVersion: string;
  shouldVerify: boolean;
  ignoreUnverified?: boolean;
}): Promise<{
  archiveBuffer: Buffer;
  archivePath: string;
  verificationResult?: PackageVerificationResult;
}> {
  const logger = appContextService.getLogger();
  let { download: archivePath } = await getInfo(pkgName, pkgVersion);

  // Bundled packages don't have a download path when they're installed, as they're
  // ArchivePackage objects - so we fake the download path here instead
  if (!archivePath) {
    archivePath = `/epr/${pkgName}/${pkgName}-${pkgVersion}.zip`;
  }
  const registryUrl = getRegistryUrl();
  const archiveUrl = `${registryUrl}${archivePath}`;
  const archiveBuffer = await getResponseStream(archiveUrl).then(streamToBuffer);

  if (shouldVerify) {
    const verificationResult = await verifyPackageArchiveSignature({
      pkgName,
      pkgVersion,
      pkgArchiveBuffer: archiveBuffer,
      logger,
    });

    if (verificationResult.verificationStatus === 'unverified' && !ignoreUnverified) {
      throw new PackageFailedVerificationError(pkgName, pkgVersion);
    }
    return { archiveBuffer, archivePath, verificationResult };
  }
  return { archiveBuffer, archivePath };
}

export async function getPackageArchiveSignatureOrUndefined({
  pkgName,
  pkgVersion,
  logger,
}: {
  pkgName: string;
  pkgVersion: string;
  logger: Logger;
}): Promise<string | undefined> {
  const { signature_path: signaturePath } = await getInfo(pkgName, pkgVersion);

  if (!signaturePath) {
    logger.debug(
      `Package ${pkgName}-${pkgVersion} does not have a signature_path, verification will not be possible.`
    );
    return undefined;
  }

  try {
    const { body } = await fetchFile(signaturePath);

    return streamToString(body);
  } catch (e) {
    logger.error(`Error retrieving package signature at '${signaturePath}' : ${e}`);
    return undefined;
  }
}

export function groupPathsByService(paths: string[]): AssetsGroupedByServiceByType {
  const kibanaAssetTypes = Object.values<string>(KibanaAssetType);

  // ASK: best way, if any, to avoid `any`?
  const assets = paths.reduce((map: any, path) => {
    const parts = getPathParts(path.replace(/^\/package\//, ''));
    if (
      (parts.service === 'kibana' && kibanaAssetTypes.includes(parts.type)) ||
      parts.service === 'elasticsearch'
    ) {
      if (!map[parts.service]) map[parts.service] = {};
      if (!map[parts.service][parts.type]) map[parts.service][parts.type] = [];
      map[parts.service][parts.type].push(parts);
    }

    return map;
  }, {});

  return {
    kibana: assets.kibana,
    elasticsearch: assets.elasticsearch,
  };
}

export function getNoticePath(paths: string[]): string | undefined {
  for (const path of paths) {
    const parts = getPathParts(path.replace(/^\/package\//, ''));
    if (parts.type === 'notice') {
      const { pkgName, pkgVersion } = splitPkgKey(parts.pkgkey);
      return `/package/${pkgName}/${pkgVersion}/${parts.file}`;
    }
  }

  return undefined;
}

export function getLicensePath(paths: string[]): string | undefined {
  for (const path of paths) {
    const parts = getPathParts(path.replace(/^\/package\//, ''));
    if (parts.type === 'license') {
      const { pkgName, pkgVersion } = splitPkgKey(parts.pkgkey);
      return `/package/${pkgName}/${pkgVersion}/${parts.file}`;
    }
  }

  return undefined;
}
