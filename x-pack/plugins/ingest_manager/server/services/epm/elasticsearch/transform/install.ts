/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'kibana/server';

import { saveInstalledEsRefs } from '../../packages/install';
import * as Registry from '../../registry';
import {
  ElasticsearchAssetType,
  EsAssetReference,
  InstallablePackage,
} from '../../../../../common/types/models';
import { CallESAsCurrentUser } from '../../../../types';
import { getInstallation } from '../../packages';
import { deleteTransforms, deleteTransformRefs } from './remove';
import { getAsset } from './common';
import { appContextService } from '../../../app_context';

interface TransformInstallation {
  installationName: string;
  content: string;
}

export const installTransform = async (
  installablePackage: InstallablePackage,
  paths: string[],
  callCluster: CallESAsCurrentUser,
  savedObjectsClient: SavedObjectsClientContract
) => {
  const logger = appContextService.getLogger();
  const installation = await getInstallation({
    savedObjectsClient,
    pkgName: installablePackage.name,
  });
  let previousInstalledTransformEsAssets: EsAssetReference[] = [];
  if (installation) {
    previousInstalledTransformEsAssets = installation.installed_es.filter(
      ({ type, id }) => type === ElasticsearchAssetType.transform
    );
    logger.info(
      `Found previous transform references:\n ${JSON.stringify(previousInstalledTransformEsAssets)}`
    );
  }

  // delete all previous transform
  await deleteTransforms(
    callCluster,
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
      return {
        installationName: getTransformNameForInstallation(
          installablePackage,
          path,
          installNameSuffix
        ),
        content: getAsset(path).toString('utf-8'),
      };
    });

    const installationPromises = transforms.map(async (transform) => {
      return handleTransformInstall({ callCluster, transform });
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

const isTransform = (path: string) => {
  const pathParts = Registry.pathParts(path);
  return !path.endsWith('/') && pathParts.type === ElasticsearchAssetType.transform;
};

async function handleTransformInstall({
  callCluster,
  transform,
}: {
  callCluster: CallESAsCurrentUser;
  transform: TransformInstallation;
}): Promise<EsAssetReference> {
  // defer validation on put if the source index is not available
  await callCluster('transport.request', {
    method: 'PUT',
    path: `/_transform/${transform.installationName}`,
    query: 'defer_validation=true',
    body: transform.content,
  });

  await callCluster('transport.request', {
    method: 'POST',
    path: `/_transform/${transform.installationName}/_start`,
  });

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
