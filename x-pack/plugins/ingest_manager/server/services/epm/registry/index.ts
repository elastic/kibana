/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Response } from 'node-fetch';
import { URL } from 'url';
import {
  AssetParts,
  AssetsGroupedByServiceByType,
  CategoryId,
  CategorySummaryList,
  KibanaAssetType,
  RegistryPackage,
  RegistrySearchResults,
  RegistrySearchResult,
} from '../../../types';
import { cacheGet, cacheSet, getCacheKey, cacheHas } from './cache';
import { ArchiveEntry, untarBuffer } from './extract';
import { fetchUrl, getResponse, getResponseStream } from './requests';
import { streamToBuffer } from './streams';
import { getRegistryUrl } from './registry_url';
import { appContextService } from '../..';

export { ArchiveEntry } from './extract';

export interface SearchParams {
  category?: CategoryId;
  experimental?: boolean;
}

export interface CategoriesParams {
  experimental?: boolean;
}

export const pkgToPkgKey = ({ name, version }: { name: string; version: string }) =>
  `${name}-${version}`;

export async function fetchList(params?: SearchParams): Promise<RegistrySearchResults> {
  const registryUrl = getRegistryUrl();
  const url = new URL(`${registryUrl}/search`);
  if (params) {
    if (params.category) {
      url.searchParams.set('category', params.category);
    }
    if (params.experimental) {
      url.searchParams.set('experimental', params.experimental.toString());
    }
  }
  const kibanaVersion = appContextService.getKibanaVersion().split('-')[0]; // may be 8.0.0-SNAPSHOT
  if (kibanaVersion) {
    url.searchParams.set('kibana.version', kibanaVersion);
  }

  return fetchUrl(url.toString()).then(JSON.parse);
}

export async function fetchFindLatestPackage(packageName: string): Promise<RegistrySearchResult> {
  const registryUrl = getRegistryUrl();
  const url = new URL(
    `${registryUrl}/search?package=${packageName}&internal=true&experimental=true`
  );
  const kibanaVersion = appContextService.getKibanaVersion().split('-')[0]; // may be 8.0.0-SNAPSHOT
  if (kibanaVersion) {
    url.searchParams.set('kibana.version', kibanaVersion);
  }
  const res = await fetchUrl(url.toString());
  const searchResults = JSON.parse(res);
  if (searchResults.length) {
    return searchResults[0];
  } else {
    throw new Error('package not found');
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

export async function getArchiveInfo(
  pkgName: string,
  pkgVersion: string,
  filter = (entry: ArchiveEntry): boolean => true
): Promise<string[]> {
  const paths: string[] = [];
  const onEntry = (entry: ArchiveEntry) => {
    const { path, buffer } = entry;
    const { file } = pathParts(path);
    if (!file) return;
    if (buffer) {
      cacheSet(path, buffer);
      paths.push(path);
    }
  };

  await extract(pkgName, pkgVersion, filter, onEntry);

  return paths;
}

export function pathParts(path: string): AssetParts {
  let dataset;

  let [pkgkey, service, type, file] = path.split('/');

  // if it's a dataset
  if (service === 'dataset') {
    // save the dataset name
    dataset = type;
    // drop the `dataset/dataset-name` portion & re-parse
    [pkgkey, service, type, file] = path.replace(`dataset/${dataset}/`, '').split('/');
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

async function extract(
  pkgName: string,
  pkgVersion: string,
  filter = (entry: ArchiveEntry): boolean => true,
  onEntry: (entry: ArchiveEntry) => void
) {
  const archiveBuffer = await getOrFetchArchiveBuffer(pkgName, pkgVersion);

  return untarBuffer(archiveBuffer, filter, onEntry);
}

async function getOrFetchArchiveBuffer(pkgName: string, pkgVersion: string): Promise<Buffer> {
  // assume .tar.gz for now. add support for .zip if/when we need it
  const key = getCacheKey(`${pkgName}-${pkgVersion}`);
  let buffer = cacheGet(key);
  if (!buffer) {
    buffer = await fetchArchiveBuffer(pkgName, pkgVersion);
    cacheSet(key, buffer);
  }

  if (buffer) {
    return buffer;
  } else {
    throw new Error(`no archive buffer for ${key}`);
  }
}

export async function ensureCachedArchiveInfo(name: string, version: string) {
  const pkgkey = getCacheKey(`${name}-${version}`);
  if (!cacheHas(pkgkey)) {
    await getArchiveInfo(name, version);
  }
}

async function fetchArchiveBuffer(pkgName: string, pkgVersion: string): Promise<Buffer> {
  const { download: archivePath } = await fetchInfo(pkgName, pkgVersion);
  const registryUrl = getRegistryUrl();
  return getResponseStream(`${registryUrl}${archivePath}`).then(streamToBuffer);
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
