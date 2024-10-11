/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';

import type { PackageInstallContext } from '../../../../../common/types';
import type { KibanaAssetReference, KibanaAssetType } from '../../../../types';
import type { ArchiveEntry } from '../../archive';
import { getPathParts } from '../../archive';

import type { ArchiveAsset } from './install';
import {
  KibanaSavedObjectTypeMapping,
  createSavedObjectKibanaAsset,
  isKibanaAssetType,
  toAssetReference,
} from './install';

interface InstallKibanaAssetsWithStreamingArgs {
  packageInstallContext: PackageInstallContext;
  spaceId: string;
  savedObjectsClient: SavedObjectsClientContract;
}

const MAX_ASSETS_TO_INSTALL_IN_PARALLEL = 100;

export async function installKibanaAssetsWithStreaming({
  savedObjectsClient,
  packageInstallContext,
}: InstallKibanaAssetsWithStreamingArgs): Promise<KibanaAssetReference[]> {
  const { archiveIterator } = packageInstallContext;

  const assetRefs: KibanaAssetReference[] = [];
  let batch: ArchiveAsset[] = [];

  await archiveIterator.traverseEntries(async ({ path, buffer }: ArchiveEntry) => {
    if (!buffer || !isKibanaAssetType(path)) {
      return;
    }
    const savedObject = JSON.parse(buffer.toString('utf8')) as ArchiveAsset;
    const assetType = getPathParts(path).type as KibanaAssetType;
    const soType = KibanaSavedObjectTypeMapping[assetType];
    if (savedObject.type !== soType) {
      return;
    }

    batch.push(savedObject);
    assetRefs.push(toAssetReference(savedObject));

    if (batch.length >= MAX_ASSETS_TO_INSTALL_IN_PARALLEL) {
      await bulkCreateSavedObjects({
        savedObjectsClient,
        kibanaAssets: batch,
        refresh: false,
      });
      batch = [];
    }
  });

  // install any remaining assets
  if (batch.length) {
    await bulkCreateSavedObjects({
      savedObjectsClient,
      kibanaAssets: batch,
      // Use wait_for with the last batch to ensure all assets are readable once the install is complete
      refresh: 'wait_for',
    });
  }
  return assetRefs;
}

async function bulkCreateSavedObjects({
  savedObjectsClient,
  kibanaAssets,
  refresh,
}: {
  kibanaAssets: ArchiveAsset[];
  savedObjectsClient: SavedObjectsClientContract;
  refresh?: boolean | 'wait_for';
}) {
  if (!kibanaAssets.length) {
    return [];
  }

  const toBeSavedObjects = kibanaAssets.map((asset) => createSavedObjectKibanaAsset(asset));

  const { saved_objects: createdSavedObjects } = await savedObjectsClient.bulkCreate(
    toBeSavedObjects,
    {
      // We only want to install new saved objects without overwriting existing ones
      overwrite: false,
      managed: true,
      refresh,
    }
  );

  return createdSavedObjects;
}
