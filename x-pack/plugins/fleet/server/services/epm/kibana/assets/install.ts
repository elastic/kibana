/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import { SavedObjectsImporter } from 'src/core/server';
import type {
  SavedObject,
  SavedObjectsBulkCreateObject,
  SavedObjectsClientContract,
} from 'src/core/server';
import type { SavedObjectsImportSuccess } from 'src/core/server/types';

import { createListStream } from '@kbn/utils';

import { PACKAGES_SAVED_OBJECT_TYPE } from '../../../../../common';
import { getAsset, getPathParts } from '../../archive';
import { KibanaAssetType, KibanaSavedObjectType } from '../../../../types';
import type { AssetType, AssetReference, AssetParts } from '../../../../types';
import { savedObjectTypes } from '../../packages';
import { indexPatternTypes } from '../index_pattern/install';
import { appContextService } from '../../../../services';

const validKibanaAssetTypes = new Set(Object.values(KibanaAssetType));
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
  [KibanaAssetType.lens]: KibanaSavedObjectType.lens,
  [KibanaAssetType.mlModule]: KibanaSavedObjectType.mlModule,
  [KibanaAssetType.securityRule]: KibanaSavedObjectType.securityRule,
  [KibanaAssetType.tag]: KibanaSavedObjectType.tag,
};

const AssetFilters: Record<string, (kibanaAssets: ArchiveAsset[]) => ArchiveAsset[]> = {
  [KibanaAssetType.indexPattern]: removeReservedIndexPatterns,
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

export async function installKibanaAssets(options: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgName: string;
  kibanaAssets: Record<KibanaAssetType, ArchiveAsset[]>;
}): Promise<SavedObjectsImportSuccess[]> {
  const { savedObjectsClient, kibanaAssets } = options;
  const assetsToInstall = Object.entries(kibanaAssets).flatMap(([assetType, assets]) => {
    if (!validKibanaAssetTypes.has(assetType as KibanaAssetType)) {
      return [];
    }

    if (!assets.length) {
      return [];
    }

    const assetFilter = AssetFilters[assetType];
    if (assetFilter) {
      return assetFilter(assets);
    }

    return assets;
  });

  if (!assetsToInstall.length) {
    return [];
  }

  const installedAssets = await installKibanaSavedObjects({
    savedObjectsClient,
    kibanaAssets: assetsToInstall,
  });

  return installedAssets;
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
    const parts = getPathParts(path);

    return parts.service === 'kibana' && (kibanaAssetTypes as string[]).includes(parts.type);
  };

  const filteredPaths = paths
    .filter(isKibanaAssetType)
    .map<[string, AssetParts]>((path) => [path, getPathParts(path)]);

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
    const savedObjectsImporter = appContextService
      .getSavedObjects()
      .createImporter(savedObjectsClient);

    const { successResults, errors } = await savedObjectsImporter.import({
      overwrite: true,
      readStream: createListStream(toBeSavedObjects),
      createNewCopies: false,
      supportedTypesOverride: Object.values(KibanaSavedObjectTypeMapping),
    });

    if (errors?.length) {
      throw new Error(
        `Encountered ${errors.length} creating saved objects: ${JSON.stringify(
          errors.map(({ type, id, error }) => ({ type, id, error })) // discard other fields
        )}`
      );
    }

    return successResults || [];
  }
}

// Filter out any reserved index patterns
function removeReservedIndexPatterns(kibanaAssets: ArchiveAsset[]) {
  const reservedPatterns = indexPatternTypes.map((pattern) => `${pattern}-*`);

  return kibanaAssets.filter((asset) => !reservedPatterns.includes(asset.id));
}

export function toAssetReference({ id, type }: SavedObject) {
  const reference: AssetReference = { id, type: type as KibanaSavedObjectType };

  return reference;
}
