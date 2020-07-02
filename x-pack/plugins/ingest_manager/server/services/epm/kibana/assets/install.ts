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
import * as Registry from '../../registry';
import { AssetType, KibanaAssetType, AssetReference } from '../../../../types';

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

export function createSavedObjectKibanaAsset(
  jsonAsset: ArchiveAsset,
  pkgName: string
): SavedObjectToBe {
  // convert that to an object
  const asset = changeAssetIds(jsonAsset, pkgName);

  return {
    type: asset.type,
    id: asset.id,
    attributes: asset.attributes,
    references: asset.references || [],
    migrationVersion: asset.migrationVersion || {},
  };
}

// modifies id property and the id property of references objects (not index-pattern)
// to be prepended with the package name to distinguish assets from Beats modules' assets
export const changeAssetIds = (asset: ArchiveAsset, pkgName: string): ArchiveAsset => {
  const references = asset.references.map((ref) => {
    if (ref.type === KibanaAssetType.indexPattern) return ref;
    const id = getAssetId(ref.id, pkgName);
    return { ...ref, id };
  });
  return {
    ...asset,
    id: getAssetId(asset.id, pkgName),
    references,
  };
};

export const getAssetId = (id: string, pkgName: string) => {
  return `${pkgName}-${id}`;
};

// TODO: make it an exhaustive list
// e.g. switch statement with cases for each enum key returning `never` for default case
export async function installKibanaAssets(options: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgName: string;
  paths: string[];
}) {
  const { savedObjectsClient, paths, pkgName } = options;

  // Only install Kibana assets during package installation.
  const kibanaAssetTypes = Object.values(KibanaAssetType);
  const installationPromises = kibanaAssetTypes.map((assetType) =>
    installKibanaSavedObjects({ savedObjectsClient, assetType, paths, pkgName })
  );

  // installKibanaSavedObjects returns AssetReference[], so .map creates AssetReference[][]
  // call .flat to flatten into one dimensional array
  return Promise.all(installationPromises).then((results) => results.flat());
}

async function installKibanaSavedObjects({
  savedObjectsClient,
  assetType,
  paths,
  pkgName,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  assetType: KibanaAssetType;
  paths: string[];
  pkgName: string;
}) {
  const isSameType = (path: string) => assetType === Registry.pathParts(path).type;
  const pathsOfType = paths.filter((path) => isSameType(path));
  const kibanaAssets = await Promise.all(pathsOfType.map((path) => getKibanaAsset(path)));
  const toBeSavedObjects = await Promise.all(
    kibanaAssets.map((asset) => createSavedObjectKibanaAsset(asset, pkgName))
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
