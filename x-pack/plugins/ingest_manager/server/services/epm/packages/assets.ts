/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RegistryPackage } from '../../../types';
import * as Registry from '../registry';
import { ensureCachedArchiveInfo } from '../registry';

// paths from RegistryPackage are routes to the assets on EPR
// e.g. `/package/nginx/1.2.0/dataset/access/fields/fields.yml`
// paths for ArchiveEntry are routes to the assets in the archive
// e.g. `nginx-1.2.0/dataset/access/fields/fields.yml`
// RegistryPackage paths have a `/package/` prefix compared to ArchiveEntry paths
// and different package and version structure
const EPR_PATH_PREFIX = '/package';
function registryPathToArchivePath(registryPath: RegistryPackage['path']): string {
  const path = registryPath.replace(`${EPR_PATH_PREFIX}/`, '');
  const [pkgName, pkgVersion] = path.split('/');
  return path.replace(`${pkgName}/${pkgVersion}`, `${pkgName}-${pkgVersion}`);
}

export function getAssets(
  packageInfo: RegistryPackage,
  filter = (path: string): boolean => true,
  datasetName?: string
): string[] {
  const assets: string[] = [];
  if (!packageInfo?.assets) return assets;

  // Skip directories
  for (const path of packageInfo.assets) {
    if (path.endsWith('/')) {
      continue;
    }

    // if dataset, filter for them
    if (datasetName) {
      const comparePath = `${packageInfo.path}/dataset/${datasetName}/`;
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
  packageInfo: RegistryPackage,
  filter = (path: string): boolean => true,
  datasetName?: string
): Promise<Registry.ArchiveEntry[]> {
  // TODO: Needs to be called to fill the cache but should not be required

  await ensureCachedArchiveInfo(packageInfo.name, packageInfo.version);

  // Gather all asset data
  const assets = getAssets(packageInfo, filter, datasetName);
  const entries: Registry.ArchiveEntry[] = assets.map((registryPath) => {
    const archivePath = registryPathToArchivePath(registryPath);
    const buffer = Registry.getAsset(archivePath);

    return { path: registryPath, buffer };
  });

  return entries;
}
