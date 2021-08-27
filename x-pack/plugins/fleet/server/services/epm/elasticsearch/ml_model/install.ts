/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from 'kibana/server';
import { ResponseError } from '@elastic/elasticsearch/lib/errors';

import { saveInstalledEsRefs } from '../../packages/install';
import { getPathParts } from '../../archive';
import { ElasticsearchAssetType } from '../../../../../common/types/models';
import type { EsAssetReference, InstallablePackage } from '../../../../../common/types/models';
import { getInstallation } from '../../packages';
import { appContextService } from '../../../app_context';

import { deleteMlModel, deleteMlModelRefs } from './remove';
import { getAsset } from './common';

interface MlModelInstallation {
  installationName: string;
  content: string;
}

export const installMlModel = async (
  installablePackage: InstallablePackage,
  paths: string[],
  esClient: ElasticsearchClient,
  savedObjectsClient: SavedObjectsClientContract
) => {
  const logger = appContextService.getLogger();
  const installation = await getInstallation({
    savedObjectsClient,
    pkgName: installablePackage.name,
  });
  let previousInstalledMlModelEsAssets: EsAssetReference[] = [];
  if (installation) {
    previousInstalledMlModelEsAssets = installation.installed_es.filter(
      ({ type, id }) => type === ElasticsearchAssetType.mlModel
    );
    if (previousInstalledMlModelEsAssets.length) {
      logger.info(
        `Found previous ml model references:\n ${JSON.stringify(previousInstalledMlModelEsAssets)}`
      );
    }
  }

  // delete all previous ml models of this type
  await deleteMlModel(
    esClient,
    previousInstalledMlModelEsAssets.map((asset) => asset.id)
  );

  // const installNameSuffix = `${installablePackage.version}`;
  const mlModelPath = paths.find((path) => isMlModel(path));

  const installedMlModels: EsAssetReference[] = [];
  if (mlModelPath !== undefined) {
    const content = getAsset(mlModelPath).toString('utf-8');
    const mlModelObject = JSON.parse(content);

    const mlModelRef = {
      id: mlModelObject.model_id, // getMlModelNameForInstallation(installablePackage, mlModelPath, installNameSuffix),
      type: ElasticsearchAssetType.mlModel,
    };

    // get and save ml model refs before installing ml model
    await saveInstalledEsRefs(savedObjectsClient, installablePackage.name, [mlModelRef]);

    const mlModel: MlModelInstallation = {
      installationName: mlModelObject.model_id,
      // installationName: getMlModelNameForInstallation(
      //   installablePackage,
      //   path,
      //   installNameSuffix
      // ),
      content,
    };

    const result = await handleMlModelInstall({ esClient, mlModel });
    installedMlModels.push(result);
  }

  if (previousInstalledMlModelEsAssets.length > 0) {
    const currentInstallation = await getInstallation({
      savedObjectsClient,
      pkgName: installablePackage.name,
    });

    // remove the saved object reference
    await deleteMlModelRefs(
      savedObjectsClient,
      currentInstallation?.installed_es || [],
      installablePackage.name,
      previousInstalledMlModelEsAssets.map((asset) => asset.id),
      installedMlModels.map((installed) => installed.id)
    );
  }
  return installedMlModels;
};

const isMlModel = (path: string) => {
  const pathParts = getPathParts(path);

  return !path.endsWith('/') && pathParts.type === ElasticsearchAssetType.mlModel;
};

async function handleMlModelInstall({
  esClient,
  mlModel,
}: {
  esClient: ElasticsearchClient;
  mlModel: MlModelInstallation;
}): Promise<EsAssetReference> {
  try {
    await esClient.ml.putTrainedModel({
      model_id: mlModel.installationName,
      body: mlModel.content,
    });
  } catch (err) {
    // swallow the error if the ml model already exists.
    const isAlreadyExistError =
      err instanceof ResponseError &&
      err?.body?.error?.type === 'resource_already_exists_exception';
    if (!isAlreadyExistError) {
      throw err;
    }
  }

  return { id: mlModel.installationName, type: ElasticsearchAssetType.mlModel };
}

// const getMlModelNameForInstallation = (
//   installablePackage: InstallablePackage,
//   path: string,
//   suffix: string
// ) => {
//   const pathPaths = path.split('/');
//   const filename = pathPaths?.pop()?.split('.')[0];
//   const folderName = pathPaths?.pop();
//   return `${installablePackage.name}.${folderName}-${filename}-${suffix}`;
// };
