/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SavedObject,
  SavedObjectsBulkCreateObject,
  SavedObjectsClientContract,
} from 'src/core/server';
import { PACKAGES_SAVED_OBJECT_TYPE } from '../../../../../common';
import * as Registry from '../../registry';
import { AssetType, KibanaAssetType, AssetReference } from '../../../../types';
import { savedObjectTypes } from '../../packages';

type SavedObjectToBe = Required<Pick<SavedObjectsBulkCreateObject, keyof ArchiveAsset>> & {
  type: AssetType;
};
export type ArchiveAsset = Pick<
  SavedObject,
  'id' | 'attributes' | 'migrationVersion' | 'references'
> & {
  type: AssetType;
};

export async function getKibanaAsset(key: string): Promise<ArchiveAsset> {
  const buffer = Registry.getAsset(key);

  // cache values are buffers. convert to string / JSON
  return JSON.parse(buffer.toString('utf8'));
}

export function createSavedObjectKibanaAsset(asset: ArchiveAsset): SavedObjectToBe {
  // convert that to an object
  return {
    type: asset.type,
    id: asset.id,
    attributes: asset.attributes,
    references: asset.references || [],
    migrationVersion: asset.migrationVersion || {},
  };
}

// TODO: make it an exhaustive list
// e.g. switch statement with cases for each enum key returning `never` for default case
export async function installKibanaAssets(options: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgName: string;
  kibanaAssets: ArchiveAsset[];
}): Promise<SavedObject[]> {
  const { savedObjectsClient, kibanaAssets } = options;

  // install the assets
  const kibanaAssetTypes = Object.values(KibanaAssetType);
  const installedAssets = await Promise.all(
    kibanaAssetTypes.map((assetType) =>
      installKibanaSavedObjects({ savedObjectsClient, assetType, kibanaAssets })
    )
  );
  return installedAssets.flat();
}
export const deleteKibanaInstalledRefs = async (
  savedObjectsClient: SavedObjectsClientContract,
  pkgName: string,
  installedKibanaRefs: AssetReference[]
) => {
  const installedAssetsToSave = installedKibanaRefs.filter(({ id, type }) => {
    const assetType = type as AssetType;
    return !savedObjectTypes.includes(assetType);
  });

  return savedObjectsClient.update(PACKAGES_SAVED_OBJECT_TYPE, pkgName, {
    installed_kibana: installedAssetsToSave,
  });
};
export async function getKibanaAssets(paths: string[]) {
  const isKibanaAssetType = (path: string) => Registry.pathParts(path).type in KibanaAssetType;
  const filteredPaths = paths.filter(isKibanaAssetType);
  const kibanaAssets = await Promise.all(filteredPaths.map((path) => getKibanaAsset(path)));
  return kibanaAssets;
}
async function installKibanaSavedObjects({
  savedObjectsClient,
  assetType,
  kibanaAssets,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  assetType: KibanaAssetType;
  kibanaAssets: ArchiveAsset[];
}) {
  const isSameType = (asset: ArchiveAsset) => assetType === asset.type;
  const filteredKibanaAssets = kibanaAssets.filter((asset) => isSameType(asset));
  const toBeSavedObjects = await Promise.all(
    filteredKibanaAssets.map((asset) => createSavedObjectKibanaAsset(asset))
  );

  if (toBeSavedObjects.length === 0) {
    return [];
  } else {
    const createResults = await savedObjectsClient.bulkCreate(toBeSavedObjects, {
      overwrite: true,
    });
    return createResults.saved_objects;
  }
}

export function toAssetReference({ id, type }: SavedObject) {
  const reference: AssetReference = { id, type: type as KibanaAssetType };

  return reference;
}
