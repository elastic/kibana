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
import {
  AssetType,
  KibanaAssetType,
  AssetReference,
  KibanaAssetReference,
} from '../../../../types';
import { deleteKibanaSavedObjectsAssets } from '../../packages/remove';
import { getInstallationObject, savedObjectTypes } from '../../packages';

type SavedObjectToBe = Required<SavedObjectsBulkCreateObject> & { type: AssetType };
export type ArchiveAsset = Pick<
  SavedObject,
  'id' | 'attributes' | 'migrationVersion' | 'references'
> & {
  type: AssetType;
};

export async function getKibanaAsset(key: string) {
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
  paths: string[];
  isUpdate: boolean;
}): Promise<KibanaAssetReference[]> {
  const { savedObjectsClient, paths, pkgName, isUpdate } = options;

  if (isUpdate) {
    // delete currently installed kibana saved objects and installation references
    const installedPkg = await getInstallationObject({ savedObjectsClient, pkgName });
    const installedKibanaRefs = installedPkg?.attributes.installed_kibana;

    if (installedKibanaRefs?.length) {
      await deleteKibanaSavedObjectsAssets(savedObjectsClient, installedKibanaRefs);
      await deleteKibanaInstalledRefs(savedObjectsClient, pkgName, installedKibanaRefs);
    }
  }

  // install the new assets and save installation references
  const kibanaAssetTypes = Object.values(KibanaAssetType);
  const installedAssets = await Promise.all(
    kibanaAssetTypes.map((assetType) =>
      installKibanaSavedObjects({ savedObjectsClient, assetType, paths })
    )
  );
  // installKibanaSavedObjects returns AssetReference[], so .map creates AssetReference[][]
  // call .flat to flatten into one dimensional array
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

async function installKibanaSavedObjects({
  savedObjectsClient,
  assetType,
  paths,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  assetType: KibanaAssetType;
  paths: string[];
}) {
  const isSameType = (path: string) => assetType === Registry.pathParts(path).type;
  const pathsOfType = paths.filter((path) => isSameType(path));
  const kibanaAssets = await Promise.all(pathsOfType.map((path) => getKibanaAsset(path)));
  const toBeSavedObjects = await Promise.all(
    kibanaAssets.map((asset) => createSavedObjectKibanaAsset(asset))
  );

  if (toBeSavedObjects.length === 0) {
    return [];
  } else {
    const createResults = await savedObjectsClient.bulkCreate(toBeSavedObjects, {
      overwrite: true,
    });
    const createdObjects = createResults.saved_objects;
    const installed = createdObjects.map(toAssetReference);
    return installed;
  }
}

function toAssetReference({ id, type }: SavedObject) {
  const reference: AssetReference = { id, type: type as KibanaAssetType };

  return reference;
}
