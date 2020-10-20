/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import semver from 'semver';
import { Response } from 'node-fetch';
import { URL } from 'url';
import {
  AssetParts,
  AssetsGroupedByServiceByType,
  CategoryId,
  CategorySummaryList,
  InstallSource,
  KibanaAssetType,
  RegistryPackage,
  RegistrySearchResults,
  RegistrySearchResult,
} from '../../../types';
import {
  cacheGet,
  cacheSet,
  cacheDelete,
  getArchiveFilelist,
  setArchiveFilelist,
  deleteArchiveFilelist,
} from './cache';
import { ArchiveEntry, untarBuffer, unzipBuffer } from './extract';
import { fetchUrl, getResponse, getResponseStream } from './requests';
import { streamToBuffer } from './streams';
import { getRegistryUrl } from './registry_url';
import { appContextService } from '../..';
import { PackageNotFoundError, PackageCacheError } from '../../../errors';

export { ArchiveEntry } from './extract';

export interface SearchParams {
  category?: CategoryId;
  experimental?: boolean;
}

export interface CategoriesParams {
  experimental?: boolean;
}

/**
 * Extract the package name and package version from a string.
 *
 * @param pkgkey a string containing the package name delimited by the package version
 */
export function splitPkgKey(pkgkey: string): { pkgName: string; pkgVersion: string } {
  // this will return an empty string if `indexOf` returns -1
  const pkgName = pkgkey.substr(0, pkgkey.indexOf('-'));
  if (pkgName === '') {
    throw new Error('Package key parsing failed: package name was empty');
  }

  // this will return the entire string if `indexOf` return -1
  const pkgVersion = pkgkey.substr(pkgkey.indexOf('-') + 1);
  if (!semver.valid(pkgVersion)) {
    throw new Error('Package key parsing failed: package version was not a valid semver');
  }
  return { pkgName, pkgVersion };
}

export const pkgToPkgKey = ({ name, version }: { name: string; version: string }) =>
  `${name}-${version}`;

export async function fetchList(params?: SearchParams): Promise<RegistrySearchResults> {
  const registryUrl = getRegistryUrl();
  const url = new URL(`${registryUrl}/search`);
  const kibanaVersion = appContextService.getKibanaVersion().split('-')[0]; // may be x.y.z-SNAPSHOT
  const kibanaBranch = appContextService.getKibanaBranch();
  if (params) {
    if (params.category) {
      url.searchParams.set('category', params.category);
    }
    if (params.experimental) {
      url.searchParams.set('experimental', params.experimental.toString());
    }
  }

  // on master, request all packages regardless of version
  if (kibanaVersion && kibanaBranch !== 'master') {
    url.searchParams.set('kibana.version', kibanaVersion);
  }

  return fetchUrl(url.toString()).then(JSON.parse);
}

export async function fetchFindLatestPackage(packageName: string): Promise<RegistrySearchResult> {
  const registryUrl = getRegistryUrl();
  const kibanaVersion = appContextService.getKibanaVersion().split('-')[0]; // may be x.y.z-SNAPSHOT
  const kibanaBranch = appContextService.getKibanaBranch();
  const url = new URL(
    `${registryUrl}/search?package=${packageName}&internal=true&experimental=true`
  );

  // on master, request all packages regardless of version
  if (kibanaVersion && kibanaBranch !== 'master') {
    url.searchParams.set('kibana.version', kibanaVersion);
  }
  const res = await fetchUrl(url.toString());
  const searchResults = JSON.parse(res);
  if (searchResults.length) {
    return searchResults[0];
  } else {
    throw new PackageNotFoundError(`${packageName} not found`);
  }
}

export async function fetchInfo(pkgName: string, pkgVersion: string): Promise<RegistryPackage> {
  const registryUrl = getRegistryUrl();
  return fetchUrl(`${registryUrl}/package/${pkgName}/${pkgVersion}`).then(JSON.parse);
}

export async function fetchFile(filePath: string): Promise<Response> {
  const registryUrl = getRegistryUrl();
  return getResponse(`${registryUrl}${filePath}`);
}

export async function fetchCategories(params?: CategoriesParams): Promise<CategorySummaryList> {
  const registryUrl = getRegistryUrl();
  const url = new URL(`${registryUrl}/categories`);
  if (params) {
    if (params.experimental) {
      url.searchParams.set('experimental', params.experimental.toString());
    }
  }

  return fetchUrl(url.toString()).then(JSON.parse);
}

export async function unpackRegistryPackageToCache(
  pkgName: string,
  pkgVersion: string,
  filter = (entry: ArchiveEntry): boolean => true
): Promise<string[]> {
  const paths: string[] = [];
  const { archiveBuffer, archivePath } = await fetchArchiveBuffer(pkgName, pkgVersion);
  const bufferExtractor = getBufferExtractor(archivePath);
  await bufferExtractor(archiveBuffer, filter, (entry: ArchiveEntry) => {
    const { path, buffer } = entry;
    const { file } = pathParts(path);
    if (!file) return;
    if (buffer) {
      cacheSet(path, buffer);
      paths.push(path);
    }
  });

  return paths;
}

export async function loadRegistryPackage(
  pkgName: string,
  pkgVersion: string
): Promise<{ paths: string[]; registryPackageInfo: RegistryPackage }> {
  let paths = getArchiveFilelist(pkgName, pkgVersion);
  if (!paths || paths.length === 0) {
    paths = await unpackRegistryPackageToCache(pkgName, pkgVersion);
    setArchiveFilelist(pkgName, pkgVersion, paths);
  }

  // TODO: cache this as well?
  const registryPackageInfo = await fetchInfo(pkgName, pkgVersion);

  return { paths, registryPackageInfo };
}

export function pathParts(path: string): AssetParts {
  let dataset;

  let [pkgkey, service, type, file] = path.split('/');

  // if it's a data stream
  if (service === 'data_stream') {
    // save the dataset name
    dataset = type;
    // drop the `data_stream/dataset-name` portion & re-parse
    [pkgkey, service, type, file] = path.replace(`data_stream/${dataset}/`, '').split('/');
  }

  // This is to cover for the fields.yml files inside the "fields" directory
  if (file === undefined) {
    file = type;
    type = 'fields';
    service = '';
  }

  return {
    pkgkey,
    service,
    type,
    file,
    dataset,
    path,
  } as AssetParts;
}

export function getBufferExtractor(archivePath: string) {
  const isZip = archivePath.endsWith('.zip');
  const bufferExtractor = isZip ? unzipBuffer : untarBuffer;

  return bufferExtractor;
}

export async function ensureCachedArchiveInfo(
  name: string,
  version: string,
  installSource: InstallSource = 'registry'
) {
  const paths = getArchiveFilelist(name, version);
  if (!paths || paths.length === 0) {
    if (installSource === 'registry') {
      await loadRegistryPackage(name, version);
    } else {
      throw new PackageCacheError(
        `Package ${name}-${version} not cached. If it was uploaded, try uninstalling and reinstalling manually.`
      );
    }
  }
}

async function fetchArchiveBuffer(
  pkgName: string,
  pkgVersion: string
): Promise<{ archiveBuffer: Buffer; archivePath: string }> {
  const { download: archivePath } = await fetchInfo(pkgName, pkgVersion);
  const archiveUrl = `${getRegistryUrl()}${archivePath}`;
  const archiveBuffer = await getResponseStream(archiveUrl).then(streamToBuffer);

  return { archiveBuffer, archivePath };
}

export function getAsset(key: string) {
  const buffer = cacheGet(key);
  if (buffer === undefined) throw new Error(`Cannot find asset ${key}`);

  return buffer;
}

export function groupPathsByService(paths: string[]): AssetsGroupedByServiceByType {
  // ASK: best way, if any, to avoid `any`?
  const assets = paths.reduce((map: any, path) => {
    const parts = pathParts(path.replace(/^\/package\//, ''));
    if (parts.type in KibanaAssetType) {
      if (!map[parts.service]) map[parts.service] = {};
      if (!map[parts.service][parts.type]) map[parts.service][parts.type] = [];
      map[parts.service][parts.type].push(parts);
    }

    return map;
  }, {});

  return {
    kibana: assets.kibana,
    // elasticsearch: assets.elasticsearch,
  };
}

export const deletePackageCache = (name: string, version: string) => {
  // get cached archive filelist
  const paths = getArchiveFilelist(name, version);

  // delete cached archive filelist
  deleteArchiveFilelist(name, version);

  // delete cached archive files
  // this has been populated in unpackRegistryPackageToCache()
  paths?.forEach((path) => cacheDelete(path));
};
