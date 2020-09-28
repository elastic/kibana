/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'kibana/server';

import { saveInstalledEsRefs } from '../../packages/install';
import * as Registry from '../../registry';
import {
  RegistryDataStream,
  ElasticsearchAssetType,
  EsAssetReference,
  RegistryPackage,
} from '../../../../../common/types/models';
import { CallESAsCurrentUser } from '../../../../types';
import { getInstallation } from '../../packages';
import { deleteTransforms, deleteTransformRefs } from './remove';
import { getAsset } from './common';

interface TransformInstallation {
  installationName: string;
  content: string;
}

interface TransformPathDataStream {
  path: string;
  data_stream: RegistryDataStream;
}

export const installTransformForDataStream = async (
  registryPackage: RegistryPackage,
  paths: string[],
  callCluster: CallESAsCurrentUser,
  savedObjectsClient: SavedObjectsClientContract
) => {
  const installation = await getInstallation({
    savedObjectsClient,
    pkgName: registryPackage.name,
  });
  let previousInstalledTransformEsAssets: EsAssetReference[] = [];
  if (installation) {
    previousInstalledTransformEsAssets = installation.installed_es.filter(
      ({ type, id }) => type === ElasticsearchAssetType.transform
    );
  }

  // delete all previous transform
  await deleteTransforms(
    callCluster,
    previousInstalledTransformEsAssets.map((asset) => asset.id)
  );
  // install the latest data stream
  const dataStreams = registryPackage.data_streams;
  if (!dataStreams?.length) return [];
  const installNameSuffix = `${registryPackage.version}`;

  const transformPaths = paths.filter((path) => isTransform(path));
  let installedTransforms: EsAssetReference[] = [];
  if (transformPaths.length > 0) {
    const transformPathDataStreams = dataStreams.reduce<TransformPathDataStream[]>(
      (acc, dataStream) => {
        transformPaths.forEach((path) => {
          if (isDataStreamTransform(path, dataStream.path)) {
            acc.push({ path, data_stream: dataStream });
          }
        });
        return acc;
      },
      []
    );

    const transformRefs = transformPathDataStreams.reduce<EsAssetReference[]>(
      (acc, transformPathDataStream) => {
        if (transformPathDataStream) {
          acc.push({
            id: getTransformNameForInstallation(transformPathDataStream, installNameSuffix),
            type: ElasticsearchAssetType.transform,
          });
        }
        return acc;
      },
      []
    );

    // get and save transform refs before installing transforms
    await saveInstalledEsRefs(savedObjectsClient, registryPackage.name, transformRefs);

    const transforms: TransformInstallation[] = transformPathDataStreams.map(
      (transformPathDataStream: TransformPathDataStream) => {
        return {
          installationName: getTransformNameForInstallation(
            transformPathDataStream,
            installNameSuffix
          ),
          content: getAsset(transformPathDataStream.path).toString('utf-8'),
        };
      }
    );

    const installationPromises = transforms.map(async (transform) => {
      return installTransform({ callCluster, transform });
    });

    installedTransforms = await Promise.all(installationPromises).then((results) => results.flat());
  }

  if (previousInstalledTransformEsAssets.length > 0) {
    const currentInstallation = await getInstallation({
      savedObjectsClient,
      pkgName: registryPackage.name,
    });

    // remove the saved object reference
    await deleteTransformRefs(
      savedObjectsClient,
      currentInstallation?.installed_es || [],
      registryPackage.name,
      previousInstalledTransformEsAssets.map((asset) => asset.id),
      installedTransforms.map((installed) => installed.id)
    );
  }
  return installedTransforms;
};

const isTransform = (path: string) => {
  const pathParts = Registry.pathParts(path);
  return pathParts.type === ElasticsearchAssetType.transform;
};

const isDataStreamTransform = (path: string, datasetName: string) => {
  const pathParts = Registry.pathParts(path);
  return (
    !path.endsWith('/') &&
    pathParts.type === ElasticsearchAssetType.transform &&
    pathParts.dataset !== undefined &&
    datasetName === pathParts.dataset
  );
};

async function installTransform({
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
  transformDataStream: TransformPathDataStream,
  suffix: string
) => {
  const filename = transformDataStream?.path.split('/')?.pop()?.split('.')[0];
  return `${transformDataStream.data_stream.type}-${transformDataStream.data_stream.name}-${filename}-${suffix}`;
};
