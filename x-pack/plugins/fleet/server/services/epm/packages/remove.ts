/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';

import type { SavedObject } from '@kbn/core/server';

import { SavedObjectsClient } from '@kbn/core/server';

import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common/constants';

import { SavedObjectsUtils, SavedObjectsErrorHelpers } from '@kbn/core/server';
import minVersion from 'semver/ranges/min-version';

import { chunk } from 'lodash';
import pMap from 'p-map';

import { updateIndexSettings } from '../elasticsearch/index/update_settings';

import {
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  PACKAGES_SAVED_OBJECT_TYPE,
  SO_SEARCH_LIMIT,
} from '../../../constants';
import { ElasticsearchAssetType } from '../../../types';
import type {
  AssetReference,
  AssetType,
  EsAssetReference,
  KibanaAssetReference,
  Installation,
  ArchivePackage,
  RegistryPackage,
} from '../../../types';
import { deletePipeline } from '../elasticsearch/ingest_pipeline';
import { removeUnusedIndexPatterns } from '../kibana/index_pattern/install';
import { deleteTransforms } from '../elasticsearch/transform/remove';
import { deleteMlModel } from '../elasticsearch/ml_model';
import { packagePolicyService, appContextService } from '../..';
import { deletePackageCache } from '../archive';
import { deleteIlms } from '../elasticsearch/datastream_ilm/remove';
import { removeArchiveEntries } from '../archive/storage';

import { auditLoggingService } from '../../audit_logging';
import { FleetError, PackageRemovalError } from '../../../errors';

import { populatePackagePolicyAssignedAgentsCount } from '../../package_policies/populate_package_policy_assigned_agents_count';
import * as Registry from '../registry';

import { MAX_CONCURRENT_ES_ASSETS_OPERATIONS } from '../elasticsearch/transform/common';

import { getInstallation, kibanaSavedObjectTypes } from '.';

const MAX_ASSETS_TO_DELETE = 1000;

export async function removeInstallation(options: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgName: string;
  pkgVersion?: string;
  esClient: ElasticsearchClient;
  force?: boolean;
}): Promise<AssetReference[]> {
  const { savedObjectsClient, pkgName, esClient } = options;
  const installation = await getInstallation({ savedObjectsClient, pkgName });
  if (!installation) {
    throw new PackageRemovalError(`${pkgName} is not installed`);
  }
  const { total, items } = await packagePolicyService.list(
    appContextService.getInternalUserSOClientWithoutSpaceExtension(),
    {
      kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${pkgName}`,
      page: 1,
      perPage: SO_SEARCH_LIMIT,
      spaceId: '*',
    }
  );

  if (!options.force) {
    await populatePackagePolicyAssignedAgentsCount(esClient, items);
  }

  if (total > 0) {
    if (options.force || items.every((item) => (item.agents ?? 0) === 0)) {
      // delete package policies
      const ids = items.map((item) => item.id);
      await packagePolicyService.delete(savedObjectsClient, esClient, ids, {
        force: options.force,
      });
    } else {
      throw new PackageRemovalError(
        `Unable to remove package with existing package policy(s) in use by agent(s)`
      );
    }
  }

  // Delete the installed assets. Don't include installation.package_assets. Those are irrelevant to users
  const installedAssets = [...installation.installed_kibana, ...installation.installed_es];
  await deleteAssets(installation, esClient);

  // Delete the manager saved object with references to the asset objects
  // could also update with [] or some other state
  auditLoggingService.writeCustomSoAuditLog({
    action: 'delete',
    id: pkgName,
    savedObjectType: PACKAGES_SAVED_OBJECT_TYPE,
  });
  await savedObjectsClient.delete(PACKAGES_SAVED_OBJECT_TYPE, pkgName);

  // delete the index patterns if no packages are installed
  // this must be done after deleting the saved object for the current package otherwise it will retrieve the package
  // from the registry again and keep the index patterns
  await removeUnusedIndexPatterns(savedObjectsClient);

  // remove the package archive and its contents from the cache so that a reinstall fetches
  // a fresh copy from the registry
  deletePackageCache({
    name: pkgName,
    version: installation.version,
  });

  await removeArchiveEntries({ savedObjectsClient, refs: installation.package_assets });

  // successful delete's in SO client return {}. return something more useful
  return installedAssets;
}

/**
 * This method deletes saved objects resolving them whenever necessary.
 *
 * Resolving is needed when deleting assets that were installed in 7.x to
 * mitigate the breaking change that occurred in 8.0. This is a memory-intensive
 * operation as it requires loading all the saved objects into memory. It is
 * generally better to delete assets directly if the package is known to be
 * installed in 8.x or later.
 */
export async function deleteKibanaAssets({
  installedObjects,
  packageInfo,
  spaceId = DEFAULT_SPACE_ID,
}: {
  installedObjects: KibanaAssetReference[];
  spaceId?: string;
  packageInfo: RegistryPackage | ArchivePackage;
}) {
  const savedObjectsClient = new SavedObjectsClient(
    appContextService.getSavedObjects().createInternalRepository()
  );

  const namespace = SavedObjectsUtils.namespaceStringToId(spaceId);

  // TODO this should be the installed package info, not the package that is being installed
  const minKibana = packageInfo.conditions?.kibana?.version
    ? minVersion(packageInfo.conditions.kibana.version)
    : null;

  // Compare Kibana versions to determine if the package could been installed
  // only in 8.x or later. If so, we can skip SO resolution step altogether
  // and delete the assets directly. Otherwise, we need to resolve the assets
  // which might create high memory pressure if a package has a lot of assets.
  if (minKibana && minKibana.major >= 8) {
    await bulkDeleteSavedObjects(installedObjects, namespace, savedObjectsClient);
  } else {
    const { resolved_objects: resolvedObjects } = await savedObjectsClient.bulkResolve(
      installedObjects,
      { namespace }
    );

    for (const { saved_object: savedObject } of resolvedObjects) {
      auditLoggingService.writeCustomSoAuditLog({
        action: 'get',
        id: savedObject.id,
        savedObjectType: savedObject.type,
      });
    }

    const foundObjects = resolvedObjects.filter(
      ({ saved_object: savedObject }) => savedObject?.error?.statusCode !== 404
    );

    // in the case of a partial install, it is expected that some assets will be not found
    // we filter these out before calling delete
    const assetsToDelete = foundObjects.map(({ saved_object: { id, type } }) => ({ id, type }));

    await bulkDeleteSavedObjects(assetsToDelete, namespace, savedObjectsClient);
  }
}

async function bulkDeleteSavedObjects(
  assetsToDelete: Array<{ id: string; type: string }>,
  namespace: string | undefined,
  savedObjectsClient: SavedObjectsClientContract
) {
  for (const asset of assetsToDelete) {
    auditLoggingService.writeCustomSoAuditLog({
      action: 'delete',
      id: asset.id,
      savedObjectType: asset.type,
    });
  }

  // Delete assets in chunks to avoid high memory pressure. This is mostly
  // relevant for packages containing many assets, as large payload and response
  // objects are created in memory during the delete operation. While chunking
  // may work slower, it allows garbage collection to clean up memory between
  // requests.
  for (const assetsChunk of chunk(assetsToDelete, MAX_ASSETS_TO_DELETE)) {
    await savedObjectsClient.bulkDelete(assetsChunk, { namespace });
  }
}

export const deleteESAsset = async (
  installedObject: EsAssetReference,
  esClient: ElasticsearchClient
): Promise<void> => {
  const { id, type } = installedObject;
  const assetType = type as AssetType;
  if (assetType === ElasticsearchAssetType.ingestPipeline) {
    return deletePipeline(esClient, id);
  } else if (assetType === ElasticsearchAssetType.indexTemplate) {
    return deleteIndexTemplate(esClient, id);
  } else if (assetType === ElasticsearchAssetType.componentTemplate) {
    return deleteComponentTemplate(esClient, id);
  } else if (assetType === ElasticsearchAssetType.transform) {
    return deleteTransforms(esClient, [id], true);
  } else if (assetType === ElasticsearchAssetType.dataStreamIlmPolicy) {
    return deleteIlms(esClient, [id]);
  } else if (assetType === ElasticsearchAssetType.ilmPolicy) {
    return deleteIlms(esClient, [id]);
  } else if (assetType === ElasticsearchAssetType.mlModel) {
    return deleteMlModel(esClient, [id]);
  }
};

export const deleteESAssets = (
  installedObjects: EsAssetReference[],
  esClient: ElasticsearchClient
): Array<Promise<void>> => {
  return installedObjects.map((installedObject) => deleteESAsset(installedObject, esClient));
};

type Tuple = [EsAssetReference[], EsAssetReference[], EsAssetReference[], EsAssetReference[]];

export const splitESAssets = (installedEs: EsAssetReference[]) => {
  const [indexTemplatesAndPipelines, indexAssets, transformAssets, otherAssets] =
    installedEs.reduce<Tuple>(
      (
        [indexTemplateAndPipelineTypes, indexAssetTypes, transformAssetTypes, otherAssetTypes],
        asset
      ) => {
        if (
          asset.type === ElasticsearchAssetType.indexTemplate ||
          asset.type === ElasticsearchAssetType.ingestPipeline
        ) {
          indexTemplateAndPipelineTypes.push(asset);
        } else if (asset.type === ElasticsearchAssetType.index) {
          indexAssetTypes.push(asset);
        } else if (asset.type === ElasticsearchAssetType.transform) {
          transformAssetTypes.push(asset);
        } else {
          otherAssetTypes.push(asset);
        }

        return [
          indexTemplateAndPipelineTypes,
          indexAssetTypes,
          transformAssetTypes,
          otherAssetTypes,
        ];
      },
      [[], [], [], []]
    );
  return { indexTemplatesAndPipelines, indexAssets, transformAssets, otherAssets };
};

/**
 * deletePrerequisiteAssets removes the ES assets that need to be deleted first and in a certain order.
 * All the other assets can be deleted after these (see deleteAssets)
 */
export async function deletePrerequisiteAssets(
  {
    indexAssets,
    transformAssets,
    indexTemplatesAndPipelines,
  }: {
    indexAssets: EsAssetReference[];
    transformAssets: EsAssetReference[];
    indexTemplatesAndPipelines: EsAssetReference[];
  },
  esClient: ElasticsearchClient
) {
  const logger = appContextService.getLogger();
  // must unset default_pipelines settings in indices first, or pipelines associated with an index cannot not be deleted
  // must delete index templates first, or component templates which reference them cannot be deleted
  // must delete ingestPipelines first, or ml models referenced in them cannot be deleted.
  // separate the assets into Index Templates and other assets.

  try {
    // must first unset any default pipeline associated with any existing indices
    // by setting empty string
    await pMap(
      indexAssets,
      (asset) => updateIndexSettings(esClient, asset.id, { default_pipeline: '' }),
      {
        concurrency: MAX_CONCURRENT_ES_ASSETS_OPERATIONS,
      }
    );

    // in case transform's destination index contains any pipeline,
    // we should delete the transforms first
    await pMap(transformAssets, (transformAsset) => deleteESAsset(transformAsset, esClient), {
      concurrency: MAX_CONCURRENT_ES_ASSETS_OPERATIONS,
    });

    // then delete index templates and pipelines
    await pMap(indexTemplatesAndPipelines, (asset) => deleteESAsset(asset, esClient), {
      concurrency: MAX_CONCURRENT_ES_ASSETS_OPERATIONS,
    });
  } catch (err) {
    // in the rollback case, partial installs are likely, so missing assets are not an error
    if (!SavedObjectsErrorHelpers.isNotFoundError(err)) {
      logger.error(err);
    }
  }
}

async function deleteAssets(
  {
    installed_es: installedEs,
    installed_kibana: installedKibana,
    installed_kibana_space_id: spaceId = DEFAULT_SPACE_ID,
    additional_spaces_installed_kibana: installedInAdditionalSpacesKibana = {},
    name,
    version,
  }: Installation,
  esClient: ElasticsearchClient
) {
  const logger = appContextService.getLogger();
  const { indexTemplatesAndPipelines, indexAssets, transformAssets, otherAssets } =
    splitESAssets(installedEs);

  // delete assets that need to be deleted first
  await deletePrerequisiteAssets(
    {
      indexAssets,
      transformAssets,
      indexTemplatesAndPipelines,
    },
    esClient
  );

  // delete the other asset types
  try {
    const packageInfo = await Registry.fetchInfo(name, version);
    await Promise.all([
      ...deleteESAssets(otherAssets, esClient),
      deleteKibanaAssets({ installedObjects: installedKibana, spaceId, packageInfo }),
      Object.entries(installedInAdditionalSpacesKibana).map(([additionalSpaceId, kibanaAssets]) =>
        deleteKibanaAssets({
          installedObjects: kibanaAssets,
          spaceId: additionalSpaceId,
          packageInfo,
        })
      ),
    ]);
  } catch (err) {
    // in the rollback case, partial installs are likely, so missing assets are not an error
    if (!SavedObjectsErrorHelpers.isNotFoundError(err)) {
      logger.error(err);
    }
  }
}

async function deleteIndexTemplate(esClient: ElasticsearchClient, name: string): Promise<void> {
  // '*' shouldn't ever appear here, but it still would delete all templates
  if (name && name !== '*') {
    try {
      await esClient.indices.deleteIndexTemplate({ name }, { ignore: [404] });
    } catch {
      throw new FleetError(`Error deleting index template ${name}`);
    }
  }
}

async function deleteComponentTemplate(esClient: ElasticsearchClient, name: string): Promise<void> {
  // '*' shouldn't ever appear here, but it still would delete all templates
  if (name && name !== '*') {
    try {
      await esClient.cluster.deleteComponentTemplate({ name }, { ignore: [404] });
    } catch (error) {
      throw new FleetError(`Error deleting component template ${name}`);
    }
  }
}

export async function deleteKibanaSavedObjectsAssets({
  installedPkg,
  spaceId,
}: {
  installedPkg: SavedObject<Installation>;
  spaceId?: string;
}) {
  const { installed_kibana_space_id: installedSpaceId } = installedPkg.attributes;

  let refsToDelete: KibanaAssetReference[];
  let spaceIdToDelete: string | undefined;
  if (!spaceId || spaceId === installedSpaceId) {
    refsToDelete = installedPkg.attributes.installed_kibana;
    spaceIdToDelete = installedSpaceId;
  } else {
    refsToDelete = installedPkg.attributes.additional_spaces_installed_kibana?.[spaceId] ?? [];
    spaceIdToDelete = spaceId;
  }
  if (!refsToDelete.length) return;

  const logger = appContextService.getLogger();
  const assetsToDelete = refsToDelete
    .filter(({ type }) => kibanaSavedObjectTypes.includes(type))
    .map(({ id, type }) => ({ id, type } as KibanaAssetReference));

  try {
    const packageInfo = await Registry.fetchInfo(
      installedPkg.attributes.name,
      installedPkg.attributes.version
    );

    await deleteKibanaAssets({
      installedObjects: assetsToDelete,
      spaceId: spaceIdToDelete,
      packageInfo,
    });
  } catch (err) {
    // in the rollback case, partial installs are likely, so missing assets are not an error
    if (!SavedObjectsErrorHelpers.isNotFoundError(err)) {
      logger.error(err);
    }
  }
}

export function deleteILMPolicies(
  installedObjects: EsAssetReference[],
  esClient: ElasticsearchClient
) {
  const idsToDelete = installedObjects
    .filter(
      (asset) =>
        asset.type === ElasticsearchAssetType.dataStreamIlmPolicy ||
        asset.type === ElasticsearchAssetType.ilmPolicy
    )
    .map((asset) => asset.id);
  return deleteIlms(esClient, idsToDelete);
}

export function deleteMLModels(
  installedObjects: EsAssetReference[],
  esClient: ElasticsearchClient
) {
  const idsToDelete = installedObjects
    .filter((asset) => asset.type === ElasticsearchAssetType.mlModel)
    .map((asset) => asset.id);
  return deleteMlModel(esClient, idsToDelete);
}

export function cleanupComponentTemplate(
  installedObjects: EsAssetReference[],
  esClient: ElasticsearchClient
) {
  const idsToDelete = installedObjects
    .filter((asset) => asset.type === ElasticsearchAssetType.mlModel)
    .map((asset) => asset.id);
  return deleteComponentTemplate(esClient, idsToDelete[0]);
}

export function cleanupTransforms(
  installedObjects: EsAssetReference[],
  esClient: ElasticsearchClient
) {
  const idsToDelete = installedObjects
    .filter((asset) => asset.type === ElasticsearchAssetType.transform)
    .map((asset) => asset.id);
  return deleteTransforms(esClient, idsToDelete);
}
