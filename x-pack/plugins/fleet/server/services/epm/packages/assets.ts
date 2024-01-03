/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AssetsMap, PackageInfo } from '../../../types';
import { getAssetFromAssetsMap } from '../archive';
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

export function getAssetsFromAssetsMap(
  packageInfo: Pick<PackageInfo, 'version' | 'name' | 'type'>,
  assetsMap: AssetsMap,
  filter = (path: string): boolean => true,
  datasetName?: string
): string[] {
  const paths = [...assetsMap.keys()];

  if (!paths || paths.length === 0) return [];

  // filter out directories
  let assets: string[] = paths.filter((path) => !path.endsWith('/'));

  if (datasetName) {
    assets = paths.filter(maybeFilterByDataset(packageInfo, datasetName));
  }

  return assets.filter(filter);
}

export function getAssetsDataFromAssetsMap(
  packageInfo: Pick<PackageInfo, 'version' | 'name' | 'type'>,
  assetsMap: AssetsMap,
  filter = (path: string): boolean => true,
  datasetName?: string
) {
  const assets = getAssetsFromAssetsMap(packageInfo, assetsMap, filter, datasetName);
  const entries: ArchiveEntry[] = assets.map((path) => {
    const buffer = getAssetFromAssetsMap(assetsMap, path);

    return { path, buffer };
  });

  return entries;
}
