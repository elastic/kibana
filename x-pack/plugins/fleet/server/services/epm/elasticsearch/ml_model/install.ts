/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { errors } from '@elastic/elasticsearch';

import { getAssetFromAssetsMap, getPathParts } from '../../archive';
import {
  ElasticsearchAssetType,
  type PackageInstallContext,
} from '../../../../../common/types/models';
import type { EsAssetReference } from '../../../../../common/types/models';

import { retryTransientEsErrors } from '../retry';

import { updateEsAssetReferences } from '../../packages/es_assets_reference';

interface MlModelInstallation {
  installationName: string;
  content: string;
}

export const installMlModel = async (
  packageInstallContext: PackageInstallContext,
  esClient: ElasticsearchClient,
  savedObjectsClient: SavedObjectsClientContract,
  logger: Logger,
  esReferences: EsAssetReference[]
) => {
  const mlModelPath = packageInstallContext.paths.find((path) => isMlModel(path));

  if (mlModelPath !== undefined) {
    const content = getAssetFromAssetsMap(packageInstallContext.assetsMap, mlModelPath).toString(
      'utf-8'
    );
    const pathParts = mlModelPath.split('/');
    const modelId = pathParts[pathParts.length - 1].replace('.json', '');

    const mlModelRef = {
      id: modelId,
      type: ElasticsearchAssetType.mlModel,
    };

    // get and save ml model refs before installing ml model
    esReferences = await updateEsAssetReferences(
      savedObjectsClient,
      packageInstallContext.packageInfo.name,
      esReferences,
      { assetsToAdd: [mlModelRef] }
    );

    const mlModel: MlModelInstallation = {
      installationName: modelId,
      content,
    };

    await handleMlModelInstall({ esClient, logger, mlModel });
  }

  return esReferences;
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
