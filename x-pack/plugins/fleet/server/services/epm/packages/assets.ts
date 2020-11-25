/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InstallablePackage } from '../../../types';
import * as Registry from '../registry';
import { ArchiveEntry, getArchiveFilelist, getAsset } from '../archive';

// paths from RegistryPackage are routes to the assets on EPR
// e.g. `/package/nginx/1.2.0/data_stream/access/fields/fields.yml`
// paths for ArchiveEntry are routes to the assets in the archive
// e.g. `nginx-1.2.0/data_stream/access/fields/fields.yml`
// RegistryPackage paths have a `/package/` prefix compared to ArchiveEntry paths
// and different package and version structure

export function getAssets(
  packageInfo: InstallablePackage,
  filter = (path: string): boolean => true,
  datasetName?: string
): string[] {
  const assets: string[] = [];
  const paths = getArchiveFilelist(packageInfo.name, packageInfo.version);
  // TODO: might be better to throw a PackageCacheError here
  if (!paths || paths.length === 0) return assets;

  // Skip directories
  for (const path of paths) {
    if (path.endsWith('/')) {
      continue;
    }

    // if dataset, filter for them
    if (datasetName) {
      const comparePath = `${packageInfo.name}-${packageInfo.version}/data_stream/${datasetName}/`;
      if (!path.includes(comparePath)) {
        continue;
      }
    }
    if (!filter(path)) {
      continue;
    }

    assets.push(path);
  }
  return assets;
}

export async function getAssetsData(
  packageInfo: InstallablePackage,
  filter = (path: string): boolean => true,
  datasetName?: string
): Promise<ArchiveEntry[]> {
  // TODO: Needs to be called to fill the cache but should not be required

  await Registry.ensureCachedArchiveInfo(packageInfo.name, packageInfo.version, 'registry');

  // Gather all asset data
  const assets = getAssets(packageInfo, filter, datasetName);
  const entries: ArchiveEntry[] = assets.map((path) => {
    const buffer = getAsset(path);

    return { path, buffer };
  });

  return entries;
}
