/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'src/core/server';
import { PACKAGES_SAVED_OBJECT_TYPE } from '../../../constants';
import { AssetReference, AssetType, ElasticsearchAssetType } from '../../../types';
import { CallESAsCurrentUser } from '../../../types';
import { getInstallation, savedObjectTypes } from './index';
import { installIndexPatterns } from '../kibana/index_pattern/install';

export async function removeInstallation(options: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgkey: string;
  callCluster: CallESAsCurrentUser;
}): Promise<AssetReference[]> {
  const { savedObjectsClient, pkgkey, callCluster } = options;
  // TODO:  the epm api should change to /name/version so we don't need to do this
  const [pkgName] = pkgkey.split('-');
  const installation = await getInstallation({ savedObjectsClient, pkgName });
  if (!installation) throw new Error('integration does not exist');
  if (installation.removable === false)
    throw new Error(`The ${pkgName} integration is installed by default and cannot be removed`);
  const installedObjects = installation.installed || [];

  // Delete the manager saved object with references to the asset objects
  // could also update with [] or some other state
  await savedObjectsClient.delete(PACKAGES_SAVED_OBJECT_TYPE, pkgName);

  // recreate or delete index patterns when a package is uninstalled
  await installIndexPatterns(savedObjectsClient);

  // Delete the installed asset
  await deleteAssets(installedObjects, savedObjectsClient, callCluster);

  // successful delete's in SO client return {}. return something more useful
  return installedObjects;
}
async function deleteAssets(
  installedObjects: AssetReference[],
  savedObjectsClient: SavedObjectsClientContract,
  callCluster: CallESAsCurrentUser
) {
  const deletePromises = installedObjects.map(async ({ id, type }) => {
    const assetType = type as AssetType;
    if (savedObjectTypes.includes(assetType)) {
      savedObjectsClient.delete(assetType, id);
    } else if (assetType === ElasticsearchAssetType.ingestPipeline) {
      deletePipeline(callCluster, id);
    } else if (assetType === ElasticsearchAssetType.indexTemplate) {
      deleteTemplate(callCluster, id);
    }
  });
  try {
    await Promise.all([...deletePromises]);
  } catch (err) {
    throw new Error(err.message);
  }
}
async function deletePipeline(callCluster: CallESAsCurrentUser, id: string): Promise<void> {
  // '*' shouldn't ever appear here, but it still would delete all ingest pipelines
  if (id && id !== '*') {
    try {
      await callCluster('ingest.deletePipeline', { id });
    } catch (err) {
      throw new Error(`error deleting pipeline ${id}`);
    }
  }
}

async function deleteTemplate(callCluster: CallESAsCurrentUser, name: string): Promise<void> {
  // '*' shouldn't ever appear here, but it still would delete all templates
  if (name && name !== '*') {
    try {
      await callCluster('indices.deleteTemplate', { name });
    } catch {
      throw new Error(`error deleting template ${name}`);
    }
  }
}

export async function deleteAssetsByType({
  savedObjectsClient,
  callCluster,
  installedObjects,
  assetType,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  callCluster: CallESAsCurrentUser;
  installedObjects: AssetReference[];
  assetType: ElasticsearchAssetType;
}) {
  const toDelete = installedObjects.filter(asset => asset.type === assetType);
  try {
    await deleteAssets(toDelete, savedObjectsClient, callCluster);
  } catch (err) {
    throw new Error(err.message);
  }
}

export async function deleteKibanaSavedObjectsAssets(
  savedObjectsClient: SavedObjectsClientContract,
  installedObjects: AssetReference[]
) {
  const deletePromises = installedObjects.map(({ id, type }) => {
    const assetType = type as AssetType;
    if (savedObjectTypes.includes(assetType)) {
      savedObjectsClient.delete(assetType, id);
    }
  });
  await Promise.all(deletePromises);
}
