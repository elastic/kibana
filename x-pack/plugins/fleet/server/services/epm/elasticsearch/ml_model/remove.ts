/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from 'kibana/server';

import { ElasticsearchAssetType } from '../../../../types';
import type { EsAssetReference } from '../../../../types';
import { PACKAGES_SAVED_OBJECT_TYPE } from '../../../../../common/constants';
import { appContextService } from '../../../app_context';

export const deleteMlModel = async (esClient: ElasticsearchClient, mlModelIds: string[]) => {
  const logger = appContextService.getLogger();
  if (mlModelIds.length) {
    logger.info(`Deleting currently installed ml model ids ${mlModelIds}`);
  }
  await Promise.all(
    mlModelIds.map(async (modelId) => {
      await esClient.ml.deleteTrainedModel({ model_id: modelId }, { ignore: [404] });
      logger.info(`Deleted: ${modelId}`);
    })
  );
};

export const deleteMlModelRefs = async (
  savedObjectsClient: SavedObjectsClientContract,
  installedEsAssets: EsAssetReference[],
  pkgName: string,
  installedEsIdToRemove: string[],
  currentInstalledEsMlModelIds: string[]
) => {
  const seen = new Set<string>();
  const filteredAssets = installedEsAssets.filter(({ type, id }) => {
    if (type !== ElasticsearchAssetType.mlModel) return true;
    const add =
      (currentInstalledEsMlModelIds.includes(id) || !installedEsIdToRemove.includes(id)) &&
      !seen.has(id);
    seen.add(id);
    return add;
  });
  return savedObjectsClient.update(PACKAGES_SAVED_OBJECT_TYPE, pkgName, {
    installed_es: filteredAssets,
  });
};
