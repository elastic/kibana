/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'src/core/server';
import { appContextService } from '../../../';
import { CallESAsCurrentUser, ElasticsearchAssetType } from '../../../../types';
import { getInstallation } from '../../packages/get';
import { PACKAGES_SAVED_OBJECT_TYPE } from '../../../../../common';

export const deletePipelines = async (
  callCluster: CallESAsCurrentUser,
  savedObjectsClient: SavedObjectsClientContract,
  pkgName: string,
  pkgVersion: string
) => {
  const logger = appContextService.getLogger();
  const previousPipelinesPattern = `*-${pkgName}.*-${pkgVersion}`;

  try {
    await deletePipeline(callCluster, previousPipelinesPattern);
  } catch (e) {
    logger.error(e);
  }
  try {
    await deletePipelineRefs(savedObjectsClient, pkgName, pkgVersion);
  } catch (e) {
    logger.error(e);
  }
};

export const deletePipelineRefs = async (
  savedObjectsClient: SavedObjectsClientContract,
  pkgName: string,
  pkgVersion: string
) => {
  const installation = await getInstallation({ savedObjectsClient, pkgName });
  if (!installation) return;
  const installedEsAssets = installation.installed_es;
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
