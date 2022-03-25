/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setTimeout } from 'timers/promises';

import type {
  SavedObject,
  SavedObjectsBulkCreateObject,
  SavedObjectsClientContract,
  SavedObjectsImporter,
  Logger,
} from 'src/core/server';
import type { SavedObjectsImportSuccess, SavedObjectsImportFailure } from 'src/core/server/types';
import { createListStream } from '@kbn/utils';
import { partition } from 'lodash';

import { PACKAGES_SAVED_OBJECT_TYPE } from '../../../../../common';
import { getAsset, getPathParts } from '../../archive';
import { KibanaAssetType, KibanaSavedObjectType } from '../../../../types';
import type { AssetType, AssetReference, AssetParts } from '../../../../types';
import { savedObjectTypes } from '../../packages';
import { indexPatternTypes, getIndexPatternSavedObjects } from '../index_pattern/install';

type SavedObjectsImporterContract = Pick<SavedObjectsImporter, 'import' | 'resolveImportErrors'>;
const formatImportErrorsForLog = (errors: SavedObjectsImportFailure[]) =>
  JSON.stringify(
    errors.map(({ type, id, error }) => ({ type, id, error })) // discard other fields
  );
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
  [KibanaAssetType.cloudSecurityPostureRuleTemplate]:
    KibanaSavedObjectType.cloudSecurityPostureRuleTemplate,
  [KibanaAssetType.tag]: KibanaSavedObjectType.tag,
  [KibanaAssetType.osqueryPackAsset]: KibanaSavedObjectType.osqueryPackAsset,
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
  savedObjectsImporter: SavedObjectsImporterContract;
  logger: Logger;
  pkgName: string;
  kibanaAssets: Record<KibanaAssetType, ArchiveAsset[]>;
}): Promise<SavedObjectsImportSuccess[]> {
  const { kibanaAssets, savedObjectsImporter, logger } = options;
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

  // As we use `import` to create our saved objects, we have to install
  // their references (the index patterns) at the same time
  // to prevent a reference error
  const indexPatternSavedObjects = getIndexPatternSavedObjects() as ArchiveAsset[];

  const installedAssets = await installKibanaSavedObjects({
    logger,
    savedObjectsImporter,
    kibanaAssets: [...indexPatternSavedObjects, ...assetsToInstall],
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

const isImportConflictError = (e: SavedObjectsImportFailure) => e?.error?.type === 'conflict';
/**
 * retry saved object import if only conflict errors are encountered
 */
async function retryImportOnConflictError(
  importCall: () => ReturnType<SavedObjectsImporterContract['import']>,
  {
    logger,
    maxAttempts = 50,
    _attempt = 0,
  }: { logger?: Logger; _attempt?: number; maxAttempts?: number } = {}
): ReturnType<SavedObjectsImporterContract['import']> {
  const result = await importCall();

  const errors = result.errors ?? [];
  if (_attempt < maxAttempts && errors.length && errors.every(isImportConflictError)) {
    const retryCount = _attempt + 1;
    const retryDelayMs = 1000 + Math.floor(Math.random() * 3000); // 1s + 0-3s of jitter

    logger?.debug(
      `Retrying import operation after [${
        retryDelayMs * 1000
      }s] due to conflict errors: ${JSON.stringify(errors)}`
    );

    await setTimeout(retryDelayMs);
    return retryImportOnConflictError(importCall, { logger, _attempt: retryCount });
  }

  return result;
}

// only exported for testing
export async function installKibanaSavedObjects({
  savedObjectsImporter,
  kibanaAssets,
  logger,
}: {
  kibanaAssets: ArchiveAsset[];
  savedObjectsImporter: SavedObjectsImporterContract;
  logger: Logger;
}) {
  const toBeSavedObjects = await Promise.all(
    kibanaAssets.map((asset) => createSavedObjectKibanaAsset(asset))
  );

  let allSuccessResults: SavedObjectsImportSuccess[] = [];

  if (toBeSavedObjects.length === 0) {
    return [];
  } else {
    const {
      successResults: importSuccessResults = [],
      errors: importErrors = [],
      success,
    } = await retryImportOnConflictError(() =>
      savedObjectsImporter.import({
        overwrite: true,
        readStream: createListStream(toBeSavedObjects),
        createNewCopies: false,
      })
    );

    if (success) {
      allSuccessResults = importSuccessResults;
    }

    const [referenceErrors, otherErrors] = partition(
      importErrors,
      (e) => e?.error?.type === 'missing_references'
    );

    if (otherErrors?.length) {
      throw new Error(
        `Encountered ${
          otherErrors.length
        } errors creating saved objects: ${formatImportErrorsForLog(otherErrors)}`
      );
    }

    /*
    A reference error here means that a saved object reference in the references
    array cannot be found. This is an error in the package its-self but not a fatal
    one. For example a dashboard may still refer to the legacy `metricbeat-*` index
    pattern. We ignore reference errors here so that legacy version of a package
    can still be installed, but if a warning is logged it should be reported to
    the integrations team. */
    if (referenceErrors.length) {
      logger.debug(
        `Resolving ${
          referenceErrors.length
        } reference errors creating saved objects: ${formatImportErrorsForLog(referenceErrors)}`
      );

      const retries = toBeSavedObjects.map(({ id, type }) => {
        if (referenceErrors.find(({ id: idToSearch }) => idToSearch === id)) {
          return {
            id,
            type,
            ignoreMissingReferences: true,
            replaceReferences: [],
            overwrite: true,
          };
        }
        return { id, type, overwrite: true, replaceReferences: [] };
      });

      const { successResults: resolveSuccessResults = [], errors: resolveErrors = [] } =
        await savedObjectsImporter.resolveImportErrors({
          readStream: createListStream(toBeSavedObjects),
          createNewCopies: false,
          retries,
        });

      if (resolveErrors?.length) {
        throw new Error(
          `Encountered ${
            resolveErrors.length
          } errors resolving reference errors: ${formatImportErrorsForLog(resolveErrors)}`
        );
      }

      allSuccessResults = allSuccessResults.concat(resolveSuccessResults);
    }

    return allSuccessResults;
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
