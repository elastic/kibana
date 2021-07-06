/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from 'src/core/server';
import Boom from '@hapi/boom';

import { PACKAGE_POLICY_SAVED_OBJECT_TYPE, PACKAGES_SAVED_OBJECT_TYPE } from '../../../constants';
import { ElasticsearchAssetType } from '../../../types';
import type {
  AssetReference,
  AssetType,
  EsAssetReference,
  KibanaAssetReference,
  Installation,
} from '../../../types';
import { deletePipeline } from '../elasticsearch/ingest_pipeline/';
import { installIndexPatterns } from '../kibana/index_pattern/install';
import { deleteTransforms } from '../elasticsearch/transform/remove';
import { packagePolicyService, appContextService } from '../..';
import { splitPkgKey } from '../registry';
import { deletePackageCache } from '../archive';
import { deleteIlms } from '../elasticsearch/datastream_ilm/remove';
import { removeArchiveEntries } from '../archive/storage';

import { getInstallation, savedObjectTypes } from './index';

export async function removeInstallation(options: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgkey: string;
  esClient: ElasticsearchClient;
  force?: boolean;
}): Promise<AssetReference[]> {
  const { savedObjectsClient, pkgkey, esClient, force } = options;
  // TODO:  the epm api should change to /name/version so we don't need to do this
  const { pkgName, pkgVersion } = splitPkgKey(pkgkey);
  const installation = await getInstallation({ savedObjectsClient, pkgName });
  if (!installation) throw Boom.badRequest(`${pkgName} is not installed`);
  if (installation.removable === false && !force)
    throw Boom.badRequest(`${pkgName} is installed by default and cannot be removed`);

  const { total } = await packagePolicyService.list(savedObjectsClient, {
    kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${pkgName}`,
    page: 0,
    perPage: 0,
  });

  if (total > 0)
    throw Boom.badRequest(
      `unable to remove package with existing package policy(s) in use by agent(s)`
    );

  // Delete the installed assets. Don't include installation.package_assets. Those are irrelevant to users
  const installedAssets = [...installation.installed_kibana, ...installation.installed_es];
  await deleteAssets(installation, savedObjectsClient, esClient);

  // Delete the manager saved object with references to the asset objects
  // could also update with [] or some other state
  await savedObjectsClient.delete(PACKAGES_SAVED_OBJECT_TYPE, pkgName);

  // recreate or delete index patterns when a package is uninstalled
  // this must be done after deleting the saved object for the current package otherwise it will retrieve the package
  // from the registry again and reinstall the index patterns
  await installIndexPatterns({ savedObjectsClient, esClient });

  // remove the package archive and its contents from the cache so that a reinstall fetches
  // a fresh copy from the registry
  deletePackageCache({
    name: pkgName,
    version: pkgVersion,
  });

  await removeArchiveEntries({ savedObjectsClient, refs: installation.package_assets });

  // successful delete's in SO client return {}. return something more useful
  return installedAssets;
}

// TODO: this is very much like deleteKibanaSavedObjectsAssets below
function deleteKibanaAssets(
  installedObjects: KibanaAssetReference[],
  savedObjectsClient: SavedObjectsClientContract
) {
  return installedObjects.map(async ({ id, type }) => {
    return savedObjectsClient.delete(type, id);
  });
}

function deleteESAssets(
  installedObjects: EsAssetReference[],
  esClient: ElasticsearchClient
): Array<Promise<unknown>> {
  return installedObjects.map(async ({ id, type }) => {
    const assetType = type as AssetType;
    if (assetType === ElasticsearchAssetType.ingestPipeline) {
      return deletePipeline(esClient, id);
    } else if (assetType === ElasticsearchAssetType.indexTemplate) {
      return deleteIndexTemplate(esClient, id);
    } else if (assetType === ElasticsearchAssetType.componentTemplate) {
      return deleteComponentTemplate(esClient, id);
    } else if (assetType === ElasticsearchAssetType.transform) {
      return deleteTransforms(esClient, [id]);
    } else if (assetType === ElasticsearchAssetType.dataStreamIlmPolicy) {
      return deleteIlms(esClient, [id]);
    }
  });
}

async function deleteAssets(
  { installed_es: installedEs, installed_kibana: installedKibana }: Installation,
  savedObjectsClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient
) {
  const logger = appContextService.getLogger();

  // must delete index templates first, or component templates which reference them cannot be deleted
  // separate the assets into Index Templates and other assets
  type Tuple = [EsAssetReference[], EsAssetReference[]];
  const [indexTemplates, otherAssets] = installedEs.reduce<Tuple>(
    ([indexAssetTypes, otherAssetTypes], asset) => {
      if (asset.type === ElasticsearchAssetType.indexTemplate) {
        indexAssetTypes.push(asset);
      } else {
        otherAssetTypes.push(asset);
      }

      return [indexAssetTypes, otherAssetTypes];
    },
    [[], []]
  );

  try {
    // must delete index templates first
    await Promise.all(deleteESAssets(indexTemplates, esClient));
    // then the other asset types
    await Promise.all([
      ...deleteESAssets(otherAssets, esClient),
      ...deleteKibanaAssets(installedKibana, savedObjectsClient),
    ]);
  } catch (err) {
    // in the rollback case, partial installs are likely, so missing assets are not an error
    if (!savedObjectsClient.errors.isNotFoundError(err)) {
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
      throw new Error(`error deleting index template ${name}`);
    }
  }
}

async function deleteComponentTemplate(esClient: ElasticsearchClient, name: string): Promise<void> {
  // '*' shouldn't ever appear here, but it still would delete all templates
  if (name && name !== '*') {
    try {
      await esClient.cluster.deleteComponentTemplate({ name }, { ignore: [404] });
    } catch (error) {
      throw new Error(`error deleting component template ${name}`);
    }
  }
}

// TODO: this is very much like deleteKibanaAssets above
export async function deleteKibanaSavedObjectsAssets(
  savedObjectsClient: SavedObjectsClientContract,
  installedRefs: AssetReference[]
) {
  if (!installedRefs.length) return;

  const logger = appContextService.getLogger();
  const deletePromises = installedRefs.map(({ id, type }) => {
    const assetType = type as AssetType;

    if (savedObjectTypes.includes(assetType)) {
      return savedObjectsClient.delete(assetType, id);
    }
  });
  try {
    await Promise.all(deletePromises);
  } catch (err) {
    // in the rollback case, partial installs are likely, so missing assets are not an error
    if (!savedObjectsClient.errors.isNotFoundError(err)) {
      logger.error(err);
    }
  }
}
