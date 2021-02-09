/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from 'src/core/server';
import { appContextService } from '../../../';
import { CallESAsCurrentUser, ElasticsearchAssetType } from '../../../../types';
import { getInstallation } from '../../packages/get';
import { PACKAGES_SAVED_OBJECT_TYPE, EsAssetReference } from '../../../../../common';

export const deletePreviousPipelines = async (
  callCluster: CallESAsCurrentUser,
  savedObjectsClient: SavedObjectsClientContract,
  pkgName: string,
  previousPkgVersion: string
) => {
  const logger = appContextService.getLogger();
  const installation = await getInstallation({ savedObjectsClient, pkgName });
  if (!installation) return;
  const installedEsAssets = installation.installed_es;
  const installedPipelines = installedEsAssets.filter(
    ({ type, id }) =>
      type === ElasticsearchAssetType.ingestPipeline && id.includes(previousPkgVersion)
  );
  const deletePipelinePromises = installedPipelines.map(({ type, id }) => {
    return deletePipeline(callCluster, id);
  });
  try {
    await Promise.all(deletePipelinePromises);
  } catch (e) {
    logger.error(e);
  }
  try {
    await deletePipelineRefs(savedObjectsClient, installedEsAssets, pkgName, previousPkgVersion);
  } catch (e) {
    logger.error(e);
  }
};

export const deletePipelineRefs = async (
  savedObjectsClient: SavedObjectsClientContract,
  installedEsAssets: EsAssetReference[],
  pkgName: string,
  pkgVersion: string
) => {
  const filteredAssets = installedEsAssets.filter(({ type, id }) => {
    if (type !== ElasticsearchAssetType.ingestPipeline) return true;
    if (!id.includes(pkgVersion)) return true;
    return false;
  });
  return savedObjectsClient.update(PACKAGES_SAVED_OBJECT_TYPE, pkgName, {
    installed_es: filteredAssets,
  });
};
export async function deletePipeline(callCluster: CallESAsCurrentUser, id: string): Promise<void> {
  // '*' shouldn't ever appear here, but it still would delete all ingest pipelines
  if (id && id !== '*') {
    try {
      await callCluster('ingest.deletePipeline', { id });
    } catch (err) {
      throw new Error(`error deleting pipeline ${id}`);
    }
  }
}
