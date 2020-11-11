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
import { getAsset } from '../../archive';
import {
  AssetType,
  KibanaAssetType,
  AssetReference,
  AssetParts,
  KibanaSavedObjectType,
} from '../../../../types';
import { savedObjectTypes } from '../../packages';
import { indexPatternTypes } from '../index_pattern/install';

type SavedObjectToBe = Required<Pick<SavedObjectsBulkCreateObject, keyof ArchiveAsset>> & {
  type: KibanaSavedObjectType;
};
export type ArchiveAsset = Pick<
  SavedObject,
  'id' | 'attributes' | 'migrationVersion' | 'references'
> & {
  type: KibanaSavedObjectType;
};

// KibanaSavedObjectTypes are used to ensure saved objects being created for a given
// KibanaAssetType have the correct type
const KibanaSavedObjectTypeMapping: Record<KibanaAssetType, KibanaSavedObjectType> = {
  [KibanaAssetType.dashboard]: KibanaSavedObjectType.dashboard,
  [KibanaAssetType.indexPattern]: KibanaSavedObjectType.indexPattern,
  [KibanaAssetType.map]: KibanaSavedObjectType.map,
  [KibanaAssetType.search]: KibanaSavedObjectType.search,
  [KibanaAssetType.visualization]: KibanaSavedObjectType.visualization,
};

// Define how each asset type will be installed
const AssetInstallers: Record<
  KibanaAssetType,
  (args: {
    savedObjectsClient: SavedObjectsClientContract;
    kibanaAssets: ArchiveAsset[];
  }) => Promise<Array<SavedObject<unknown>>>
> = {
  [KibanaAssetType.dashboard]: installKibanaSavedObjects,
  [KibanaAssetType.indexPattern]: installKibanaIndexPatterns,
  [KibanaAssetType.map]: installKibanaSavedObjects,
  [KibanaAssetType.search]: installKibanaSavedObjects,
  [KibanaAssetType.visualization]: installKibanaSavedObjects,
};

export async function getKibanaAsset(key: string): Promise<ArchiveAsset> {
  const buffer = getAsset(key);

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
  kibanaAssets: Record<KibanaAssetType, ArchiveAsset[]>;
}): Promise<SavedObject[]> {
  const { savedObjectsClient, kibanaAssets } = options;

  // install the assets
  const kibanaAssetTypes = Object.values(KibanaAssetType);
  const installedAssets = await Promise.all(
    kibanaAssetTypes.map((assetType) => {
      if (kibanaAssets[assetType]) {
        return AssetInstallers[assetType]({
          savedObjectsClient,
          kibanaAssets: kibanaAssets[assetType],
        });
      }
      return [];
    })
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
export async function getKibanaAssets(
  paths: string[]
): Promise<Record<KibanaAssetType, ArchiveAsset[]>> {
  const kibanaAssetTypes = Object.values(KibanaAssetType);
  const isKibanaAssetType = (path: string) => {
    const parts = Registry.pathParts(path);

    return parts.service === 'kibana' && (kibanaAssetTypes as string[]).includes(parts.type);
  };

  const filteredPaths = paths
    .filter(isKibanaAssetType)
    .map<[string, AssetParts]>((path) => [path, Registry.pathParts(path)]);

  const assetArrays: Array<Promise<ArchiveAsset[]>> = [];
  for (const assetType of kibanaAssetTypes) {
    const matching = filteredPaths.filter(([path, parts]) => parts.type === assetType);

    assetArrays.push(Promise.all(matching.map(([path]) => path).map(getKibanaAsset)));
  }

  const resolvedAssets = await Promise.all(assetArrays);

  const result = {} as Record<KibanaAssetType, ArchiveAsset[]>;

  for (const [index, assetType] of kibanaAssetTypes.entries()) {
    const expectedType = KibanaSavedObjectTypeMapping[assetType];
    const properlyTypedAssets = resolvedAssets[index].filter(({ type }) => type === expectedType);

    result[assetType] = properlyTypedAssets;
  }

  return result;
}

async function installKibanaSavedObjects({
  savedObjectsClient,
  kibanaAssets,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  kibanaAssets: ArchiveAsset[];
}) {
  const toBeSavedObjects = await Promise.all(
    kibanaAssets.map((asset) => createSavedObjectKibanaAsset(asset))
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

async function installKibanaIndexPatterns({
  savedObjectsClient,
  kibanaAssets,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  kibanaAssets: ArchiveAsset[];
}) {
  // Filter out any reserved index patterns
  const reservedPatterns = indexPatternTypes.map((pattern) => `${pattern}-*`);

  const nonReservedPatterns = kibanaAssets.filter((asset) => !reservedPatterns.includes(asset.id));

  return installKibanaSavedObjects({ savedObjectsClient, kibanaAssets: nonReservedPatterns });
}

export function toAssetReference({ id, type }: SavedObject) {
  const reference: AssetReference = { id, type: type as KibanaSavedObjectType };

  return reference;
}
