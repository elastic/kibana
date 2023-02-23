/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackageInfo } from '../../../types';
import { getArchiveFilelist, getAsset } from '../archive';
import type { ArchiveEntry } from '../archive';

const maybeFilterByDataset =
  (packageInfo: Pick<PackageInfo, 'version' | 'name' | 'type'>, datasetName: string) =>
  (path: string): boolean => {
    const basePath = `${packageInfo.name}-${packageInfo.version}`;
    const comparePaths =
      packageInfo?.type === 'input'
        ? [`${basePath}/agent/input/`, `${basePath}/fields/`]
        : [`${basePath}/data_stream/${datasetName}/`];

    return comparePaths.some((comparePath) => path.includes(comparePath));
  };

// paths from RegistryPackage are routes to the assets on EPR
// e.g. `/package/nginx/1.2.0/data_stream/access/fields/fields.yml`
// paths for ArchiveEntry are routes to the assets in the archive
// e.g. `nginx-1.2.0/data_stream/access/fields/fields.yml`
// RegistryPackage paths have a `/package/` prefix compared to ArchiveEntry paths
// and different package and version structure
export function getAssets(
  packageInfo: Pick<PackageInfo, 'version' | 'name' | 'type'>,
  filter = (path: string): boolean => true,
  datasetName?: string
): string[] {
  const paths = getArchiveFilelist(packageInfo);

  if (!paths || paths.length === 0) return [];

  // filter out directories
  let assets: string[] = paths.filter((path) => !path.endsWith('/'));

  if (datasetName) {
    assets = paths.filter(maybeFilterByDataset(packageInfo, datasetName));
  }

  return assets.filter(filter);
}

export function getAssetsData(
  packageInfo: Pick<PackageInfo, 'version' | 'name' | 'type'>,
  filter = (path: string): boolean => true,
  datasetName?: string
): ArchiveEntry[] {
  // Gather all asset data
  const assets = getAssets(packageInfo, filter, datasetName);
  const entries: ArchiveEntry[] = assets.map((path) => {
    const buffer = getAsset(path);

    return { path, buffer };
  });

  return entries;
}
