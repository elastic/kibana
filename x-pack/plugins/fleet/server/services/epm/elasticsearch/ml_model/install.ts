/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from 'kibana/server';
import { errors } from '@elastic/elasticsearch';

import { saveInstalledEsRefs } from '../../packages/install';
import { getPathParts } from '../../archive';
import { ElasticsearchAssetType } from '../../../../../common/types/models';
import type { EsAssetReference, InstallablePackage } from '../../../../../common/types/models';

import { retryTransientEsErrors } from '../retry';

import { getAsset } from './common';

interface MlModelInstallation {
  installationName: string;
  content: string;
}

export const installMlModel = async (
  installablePackage: InstallablePackage,
  paths: string[],
  esClient: ElasticsearchClient,
  savedObjectsClient: SavedObjectsClientContract,
  logger: Logger
) => {
  const mlModelPath = paths.find((path) => isMlModel(path));

  const installedMlModels: EsAssetReference[] = [];
  if (mlModelPath !== undefined) {
    const content = getAsset(mlModelPath).toString('utf-8');
    const pathParts = mlModelPath.split('/');
    const modelId = pathParts[pathParts.length - 1].replace('.json', '');

    const mlModelRef = {
      id: modelId,
      type: ElasticsearchAssetType.mlModel,
    };

    // get and save ml model refs before installing ml model
    await saveInstalledEsRefs(savedObjectsClient, installablePackage.name, [mlModelRef]);

    const mlModel: MlModelInstallation = {
      installationName: modelId,
      content,
    };

    const result = await handleMlModelInstall({ esClient, logger, mlModel });
    installedMlModels.push(result);
  }
  return installedMlModels;
};

const isMlModel = (path: string) => {
  const pathParts = getPathParts(path);

  return !path.endsWith('/') && pathParts.type === ElasticsearchAssetType.mlModel;
};

async function handleMlModelInstall({
  esClient,
  logger,
  mlModel,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  mlModel: MlModelInstallation;
}): Promise<EsAssetReference> {
  try {
    await retryTransientEsErrors(
      () =>
        esClient.ml.putTrainedModel(
          {
            model_id: mlModel.installationName,
            defer_definition_decompression: true,
            timeout: '45s',
            // @ts-expect-error expects an object not a string
            body: mlModel.content,
          },
          {
            headers: {
              'content-type': 'application/json',
            },
          }
        ),
      { logger }
    );
  } catch (err) {
    // swallow the error if the ml model already exists.
    const isAlreadyExistError =
      err instanceof errors.ResponseError &&
      err?.body?.error?.type === 'resource_already_exists_exception';
    if (!isAlreadyExistError) {
      throw err;
    }
  }

  return { id: mlModel.installationName, type: ElasticsearchAssetType.mlModel };
}
