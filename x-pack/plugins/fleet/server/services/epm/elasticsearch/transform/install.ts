/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { errors } from '@elastic/elasticsearch';

import { saveInstalledEsRefs } from '../../packages/install';
import { getPathParts } from '../../archive';
import { ElasticsearchAssetType } from '../../../../../common/types/models';
import type { EsAssetReference, InstallablePackage } from '../../../../../common/types/models';
import { getInstallation } from '../../packages';

import { getESAssetMetadata } from '../meta';

import { retryTransientEsErrors } from '../retry';

import { deleteTransforms, deleteTransformRefs } from './remove';
import { getAsset } from './common';

interface TransformInstallation {
  installationName: string;
  content: any;
}

export const installTransform = async (
  installablePackage: InstallablePackage,
  paths: string[],
  esClient: ElasticsearchClient,
  savedObjectsClient: SavedObjectsClientContract,
  logger: Logger
) => {
  const installation = await getInstallation({
    savedObjectsClient,
    pkgName: installablePackage.name,
  });
  let previousInstalledTransformEsAssets: EsAssetReference[] = [];
  if (installation) {
    previousInstalledTransformEsAssets = installation.installed_es.filter(
      ({ type, id }) => type === ElasticsearchAssetType.transform
    );
    if (previousInstalledTransformEsAssets.length) {
      logger.info(
        `Found previous transform references:\n ${JSON.stringify(
          previousInstalledTransformEsAssets
        )}`
      );
    }
  }

  // delete all previous transform
  await deleteTransforms(
    esClient,
    previousInstalledTransformEsAssets.map((asset) => asset.id)
  );

  const installNameSuffix = `${installablePackage.version}`;
  const transformPaths = paths.filter((path) => isTransform(path));
  let installedTransforms: EsAssetReference[] = [];
  if (transformPaths.length > 0) {
    const transformRefs = transformPaths.reduce<EsAssetReference[]>((acc, path) => {
      acc.push({
        id: getTransformNameForInstallation(installablePackage, path, installNameSuffix),
        type: ElasticsearchAssetType.transform,
      });

      return acc;
    }, []);

    // get and save transform refs before installing transforms
    await saveInstalledEsRefs(savedObjectsClient, installablePackage.name, transformRefs);

    const transforms: TransformInstallation[] = transformPaths.map((path: string) => {
      const content = JSON.parse(getAsset(path).toString('utf-8'));
      content._meta = getESAssetMetadata({ packageName: installablePackage.name });

      return {
        installationName: getTransformNameForInstallation(
          installablePackage,
          path,
          installNameSuffix
        ),
        content,
      };
    });

    const installationPromises = transforms.map(async (transform) => {
      return handleTransformInstall({ esClient, logger, transform });
    });

    installedTransforms = await Promise.all(installationPromises).then((results) => results.flat());
  }

  if (previousInstalledTransformEsAssets.length > 0) {
    const currentInstallation = await getInstallation({
      savedObjectsClient,
      pkgName: installablePackage.name,
    });

    // remove the saved object reference
    await deleteTransformRefs(
      savedObjectsClient,
      currentInstallation?.installed_es || [],
      installablePackage.name,
      previousInstalledTransformEsAssets.map((asset) => asset.id),
      installedTransforms.map((installed) => installed.id)
    );
  }
  return installedTransforms;
};

export const isTransform = (path: string) => {
  const pathParts = getPathParts(path);
  return !path.endsWith('/') && pathParts.type === ElasticsearchAssetType.transform;
};

async function handleTransformInstall({
  esClient,
  logger,
  transform,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  transform: TransformInstallation;
}): Promise<EsAssetReference> {
  try {
    await retryTransientEsErrors(
      () =>
        // defer validation on put if the source index is not available
        esClient.transform.putTransform({
          transform_id: transform.installationName,
          defer_validation: true,
          body: transform.content,
        }),
      { logger }
    );
  } catch (err) {
    // swallow the error if the transform already exists.
    const isAlreadyExistError =
      err instanceof errors.ResponseError &&
      err?.body?.error?.type === 'resource_already_exists_exception';
    if (!isAlreadyExistError) {
      throw err;
    }
  }
  await esClient.transform.startTransform(
    { transform_id: transform.installationName },
    { ignore: [409] }
  );

  return { id: transform.installationName, type: ElasticsearchAssetType.transform };
}

const getTransformNameForInstallation = (
  installablePackage: InstallablePackage,
  path: string,
  suffix: string
) => {
  const pathPaths = path.split('/');
  const filename = pathPaths?.pop()?.split('.')[0];
  const folderName = pathPaths?.pop();
  return `${installablePackage.name}.${folderName}-${filename}-${suffix}`;
};
